"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 打气弹窗：点击首页打气按钮，随机弹出一条激励短句（来自 data/quotes.json）
 */
import { useEffect, useState } from "react";
import FixedLayer from "./FixedLayer";

let cache: string[] | null = null;

async function loadQuotes(): Promise<string[]> {
  if (cache) return cache;
  try {
    const res = await fetch("/data/quotes.json");
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length) {
        cache = list.filter((x) => typeof x === "string");
        return cache;
      }
    }
  } catch { /* 忽略 */ }
  cache = ["道阻且长，行则将至。"];
  return cache;
}

export default function BoostDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [quote, setQuote] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    loadQuotes().then((list) => {
      if (!alive) return;
      const i = Math.floor(Math.random() * list.length);
      setQuote(list[i]);
    });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <FixedLayer>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center px-6"
        style={{ background: "rgba(26,12,8,.55)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      >
        <div
          className="boost-card relative w-full max-w-[340px] overflow-hidden rounded-[28px] px-6 py-8 text-center text-white"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "linear-gradient(150deg,#FF7A18 0%,#E94560 55%,#B31E4B 100%)",
            boxShadow: "0 30px 70px -20px rgba(233,69,96,.85), 0 0 0 1px rgba(255,255,255,.2) inset",
          }}
        >
          {/* 光斑装饰 */}
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full" style={{ background: "rgba(255,255,255,.22)", filter: "blur(6px)" }} />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full" style={{ background: "rgba(255,214,102,.28)", filter: "blur(8px)" }} />

          <div className="relative">
            <div className="boost-emoji text-[46px] leading-none">🔥</div>
            <div className="mt-1 text-[11px] font-bold tracking-[.28em] opacity-85">给 你 打 气</div>

            <p className="boost-quote mt-5 text-[19px] font-extrabold leading-[1.65]" style={{ textShadow: "0 2px 12px rgba(0,0,0,.18)" }}>
              {quote}
            </p>

            <button
              onClick={onClose}
              className="mt-6 h-11 w-full rounded-2xl text-[14px] font-extrabold"
              style={{ background: "rgba(255,255,255,.95)", color: "#D6335A", boxShadow: "0 10px 24px -10px rgba(0,0,0,.4)" }}
            >
              继续上岸 →
            </button>
          </div>
        </div>
      </div>
    </FixedLayer>
  );
}
