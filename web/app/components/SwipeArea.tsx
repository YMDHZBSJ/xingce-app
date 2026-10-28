"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 左右滑动切题：用原生 touch 事件（Android WebView / iOS Safari 都可靠），
 * 桌面端用 pointer 兜底。竖直滚动不拦截。
 */
import { useEffect, useRef } from "react";

export default function SwipeArea({
  onPrev, onNext, canPrev, canNext, children,
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const begin = (x: number, y: number) => { start.current = { x, y, t: Date.now() }; };

    const finish = (x: number, y: number) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const dx = x - s.x;
      const dy = y - s.y;
      // 横向位移足够大且明显大于纵向，才算滑动切题
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if (Date.now() - s.t > 1200) return;
      if (dx < 0 && canNext) onNext();
      else if (dx > 0 && canPrev) onPrev();
    };

    const onTouchStart = (e: TouchEvent) => { if (e.touches[0]) begin(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (t) finish(t.clientX, t.clientY);
    };
    const onPointerDown = (e: PointerEvent) => { if (e.pointerType !== "touch") begin(e.clientX, e.clientY); };
    const onPointerUp = (e: PointerEvent) => { if (e.pointerType !== "touch") finish(e.clientX, e.clientY); };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", () => { start.current = null; }, { passive: true });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPrev, onNext, canPrev, canNext]);

  return <div ref={ref} data-testid="swipe-area" style={{ touchAction: "pan-y" }}>{children}</div>;
}
