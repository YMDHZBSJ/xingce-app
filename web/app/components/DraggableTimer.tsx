"use client";

/**
 * 可拖动的总用时计时器（小方块）
 * - 只显示总用时
 * - 位置记忆在 localStorage
 */
import { useEffect, useRef, useState } from "react";

const POS_KEY = "timerPos";

export default function DraggableTimer({ seconds }: { seconds: number }) {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const el = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Number.isFinite(p?.x) && Number.isFinite(p?.y)) setPos({ x: p.x, y: p.y });
      }
    } catch { /* 忽略 */ }
    setReady(true);
  }, []);

  const clamp = (x: number, y: number) => {
    const w = window.innerWidth, h = window.innerHeight;
    const bw = el.current?.offsetWidth ?? 74, bh = el.current?.offsetHeight ?? 32;
    return {
      x: Math.min(Math.max(6, x), w - bw - 6),
      y: Math.min(Math.max(70, y), h - bh - 96),
    };
  };

  const onStart = (e: React.PointerEvent) => {
    const rect = el.current?.getBoundingClientRect();
    if (!rect) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current.moved = true;
    setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
  };

  const onEnd = () => {
    if (drag.current?.moved) {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* 忽略 */ }
    }
    drag.current = null;
  };

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const text = `${m}:${String(s).padStart(2, "0")}`;

  return (
    <div
      ref={el}
      data-testid="total-timer"
      onPointerDown={onStart}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      style={{
        position: "fixed", left: pos.x || undefined, top: pos.y || undefined,
        right: pos.x ? undefined : 12, bottom: pos.y ? undefined : "calc(96px + env(safe-area-inset-bottom, 0px))",
        zIndex: 45, touchAction: "none", cursor: "grab",
        opacity: ready ? 1 : 0,
      }}
      className="flex select-none items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)]/95 px-2 py-1 shadow-md backdrop-blur"
    >
      <span className="text-[10px] text-[var(--fg-muted)]">用时</span>
      <span className="text-[12px] font-bold tabular-nums text-[var(--accent-text)]">{text}</span>
    </div>
  );
}
