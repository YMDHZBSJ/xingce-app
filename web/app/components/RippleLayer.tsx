"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect } from "react";

/** 全局按钮涟漪：点击 .xc-btn / .xc-chip / .xc-card-sm / .xc-tab 时在点击点扩散 */
export default function RippleLayer() {
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      const host = target?.closest?.(".xc-btn, .xc-chip, .xc-card-sm, .xc-tab, .xc-stat") as HTMLElement | null;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const p = "touches" in e && e.touches[0] ? e.touches[0] : (e as MouseEvent);
      const size = Math.max(rect.width, rect.height);
      const span = document.createElement("span");
      span.className = "xc-ripple-dot";
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${(p.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2}px`;
      span.style.top = `${(p.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2}px`;
      const pos = getComputedStyle(host).position;
      if (pos === "static") host.style.position = "relative";
      if (!host.style.overflow) host.style.overflow = "hidden";
      host.appendChild(span);
      setTimeout(() => span.remove(), 600);
    };
    document.addEventListener("click", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);
  return null;
}
