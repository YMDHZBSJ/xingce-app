"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useState } from "react";

/** 首次进入的启动动画（每次会话一次） */
export default function BootSplash() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("booted") === "1") return;
      sessionStorage.setItem("booted", "1");
    } catch { /* 忽略 */ }
    setShow(true);
    const t = setTimeout(() => setShow(false), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;
  return (
    <div className="xc-boot" aria-hidden>
      <div className="mark">行测</div>
      <div className="name">行测题库</div>
    </div>
  );
}
