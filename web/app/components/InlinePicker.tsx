"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 页面内选择器：点击后在当前页面展开选项列表（不用系统弹窗、不用模态框）
 */
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export interface PickerOption {
  value: string;
  label: string;
}

export default function InlinePicker({
  value, options, onChange, placeholder = "全部", ariaLabel, columns = 3, width,
}: {
  value: string;
  options: PickerOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  columns?: number;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  const current = options.find((o) => o.value === value);
  const active = !!value;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={box} className="relative" style={{ width: width ? `${width}px` : undefined }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-all ${
          active ? "text-white" : "text-[var(--fg-2)]"
        }`}
        style={
          active
            ? { background: "var(--grad)", boxShadow: "0 6px 14px -6px rgba(233,69,96,.6)" }
            : { background: "rgba(255,255,255,.9)", border: "1px solid rgba(244,112,30,.18)" }
        }
      >
        <span className="max-w-[110px] truncate">{current?.label || placeholder}</span>
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s ease", display: "flex" }}>
          <Icon name="chevron-down" size={13} />
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 z-30 mt-2 max-h-[46vh] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-2xl"
          style={{ minWidth: "min(280px, 78vw)", animation: "xc-item-in .18s ease both" }}
          role="listbox"
        >
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
          >
            {options.map((o) => {
              const on = o.value === value;
              return (
                <button
                  key={o.value || "__all"}
                  role="option"
                  aria-selected={on}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`flex h-9 items-center justify-center gap-1 truncate rounded-xl px-2 text-[12px] font-semibold ${
                    on ? "text-white" : "text-[var(--fg-2)]"
                  }`}
                  style={
                    on
                      ? { background: "var(--grad)" }
                      : { background: "var(--chip)", border: "1px solid rgba(244,112,30,.10)" }
                  }
                >
                  {on && <Icon name="check" size={12} />}
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
