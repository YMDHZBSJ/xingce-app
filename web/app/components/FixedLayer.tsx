"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** 把 fixed 浮层渲染到 body，避免被页面的 transform 动画影响定位 */
export default function FixedLayer({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
