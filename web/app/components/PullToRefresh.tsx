"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { triggerSoftRefresh } from "../lib/soft-refresh";

/** 下拉刷新：顶部下拉超过阈值后释放，重新加载当前页数据 */
export default function PullToRefresh() {
  const pathname = usePathname() || "/";
  // 做题 / 考试进行中禁用，避免下拉把作答状态刷掉
  const disabled = pathname.startsWith("/practice") || pathname.startsWith("/exam");
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (disabled) return;
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 4 || busy) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null || busy) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 4) {
        setPull(Math.min(84, dy * 0.55));
      }
    };
    const onEnd = () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pull > 54) {
        setBusy(true);
        // 软刷新：只重新拉取当前页数据，不跳转、不重载整页
        setTimeout(() => {
          triggerSoftRefresh();
          setBusy(false);
          setPull(0);
        }, 320);
      } else {
        setPull(0);
      }
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
  }, [pull, busy, disabled]);

  if (disabled || (pull <= 0 && !busy)) return null;
  return (
    <div
      className="pointer-events-none fixed left-0 right-0 top-0 z-[60] flex items-center justify-center"
      style={{ transform: `translateY(${busy ? 46 : pull - 30}px)`, transition: busy ? "transform .2s ease" : "none" }}
    >
      <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[var(--fg-2)] shadow-lg">
        <span className="xc-loader" style={{ width: 14, height: 14 }} />
        {pull > 54 ? "松开刷新" : "下拉刷新"}
      </div>
    </div>
  );
}
