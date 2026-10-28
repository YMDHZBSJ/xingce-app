"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 放大查看：
 * - 长按题干 → 底部大字阅读层
 * - 点击图片 → 全屏查看，双击放大 2 倍 / 拖动平移 / 双指缩放
 */
import { useCallback, useEffect, useRef, useState } from "react";
import FixedLayer from "./FixedLayer";

export type ZoomContent =
  | { type: "text"; html: string; title?: string }
  | { type: "image"; src: string }
  | null;

const MAX_SCALE = 4;

export default function ZoomViewer({ content, onClose }: { content: ZoomContent; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);

  const lastTap = useRef(0);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  // 每次打开重置
  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
    setAnimating(false);
  }, [content]);

  useEffect(() => {
    if (!content) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [content, onClose]);

  const clampPos = useCallback((x: number, y: number, s: number) => {
    const maxX = (window.innerWidth * (s - 1)) / 2;
    const maxY = (window.innerHeight * (s - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, []);

  const toggleZoom = useCallback((clientX?: number, clientY?: number) => {
    setAnimating(true);
    setScale((prev) => {
      if (prev > 1.05) {
        setPos({ x: 0, y: 0 });
        return 1;
      }
      // 以双击点为中心放大
      const cx = clientX ?? window.innerWidth / 2;
      const cy = clientY ?? window.innerHeight / 2;
      const next = 2;
      const nx = (window.innerWidth / 2 - cx) * (next - 1) / next * 2;
      const ny = (window.innerHeight / 2 - cy) * (next - 1) / next * 2;
      setPos(clampPos(nx * -1 * 0 + -nx, -ny, next));
      return next;
    });
    setTimeout(() => setAnimating(false), 260);
  }, [clampPos]);

  if (!content) return null;

  if (content.type === "image") {
    return (
      <FixedLayer>
        <div
          className="fixed inset-0 z-[150] overflow-hidden"
          style={{ background: "rgba(10,7,5,.96)", touchAction: "none" }}
          onDoubleClick={(e) => toggleZoom(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const [a, b] = [e.touches[0], e.touches[1]];
              pinch.current = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), scale };
              dragStart.current = null;
              return;
            }
            const t = e.touches[0];
            const now = Date.now();
            if (now - lastTap.current < 280) {
              toggleZoom(t.clientX, t.clientY);
              lastTap.current = 0;
              return;
            }
            lastTap.current = now;
            if (scale > 1.05) {
              dragStart.current = { x: t.clientX, y: t.clientY, tx: pos.x, ty: pos.y };
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinch.current) {
              const [a, b] = [e.touches[0], e.touches[1]];
              const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
              const next = Math.max(1, Math.min(MAX_SCALE, pinch.current.scale * (d / pinch.current.dist)));
              setAnimating(false);
              setScale(next);
              return;
            }
            if (e.touches.length === 1 && dragStart.current && scale > 1.05) {
              const t = e.touches[0];
              const dx = t.clientX - dragStart.current.x;
              const dy = t.clientY - dragStart.current.y;
              const p = clampPos(dragStart.current.tx + dx, dragStart.current.ty + dy, scale);
              setPos(p);
            }
          }}
          onTouchEnd={(e) => {
            if (pinch.current) {
              pinch.current = null;
              if (scale <= 1.02) { setScale(1); setPos({ x: 0, y: 0 }); }
              return;
            }
            dragStart.current = null;
            if ((e.changedTouches[0]?.clientY ?? 0) > 0 && scale <= 1.02 && e.changedTouches.length === 1) {
              // 单击（非双击）在未放大时关闭
              if (Date.now() - lastTap.current > 300) onClose();
            }
          }}
        >
          <img
            src={content.src}
            alt="题目配图"
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              maxWidth: "96vw",
              maxHeight: "86vh",
              borderRadius: 10,
              background: "#fff",
              transform: `translate(-50%,-50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              transition: animating ? "transform .26s cubic-bezier(.22,.61,.36,1)" : "none",
              willChange: "transform",
            }}
          />
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ background: "rgba(255,255,255,.18)" }}
          >
            ✕
          </button>
          <p className="absolute inset-x-0 bottom-6 z-10 text-center text-[11px] text-white/65">
            {scale > 1.05 ? "拖动可平移 · 双击还原" : "双击放大 · 双指缩放 · 点击关闭"}
          </p>
        </div>
      </FixedLayer>
    );
  }

  return (
    <FixedLayer>
      <div
        className="fixed inset-0 z-[150] flex items-end justify-center"
        style={{ background: "rgba(12,8,6,.72)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      >
        <div
          className="zoom-sheet w-full max-w-[560px] rounded-t-[26px] bg-[var(--surface)]"
          style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 pt-2">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--line)]" />
          </div>
          <div className="flex shrink-0 items-center justify-between px-4 pb-2">
            <span className="text-[12.5px] font-bold text-[var(--fg-muted)]">{content.title || "放大查看"}</span>
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] font-semibold"
            >
              关闭
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div
              className="xc-rich zoom-text"
              style={{ fontSize: 18, lineHeight: 1.9 }}
              dangerouslySetInnerHTML={{ __html: content.html }}
            />
          </div>
        </div>
      </div>
    </FixedLayer>
  );
}
