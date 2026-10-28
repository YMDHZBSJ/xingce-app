"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 打开软件自动弹出打气短句；同一小时内最多弹一次
 */
import { useEffect, useState } from "react";
import BoostDialog from "./BoostDialog";

const KEY = "boostLastAt";
const ONE_HOUR = 60 * 60 * 1000;

export default function AutoBoost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = 0;
    try { last = Number(localStorage.getItem(KEY) || 0); } catch { /* 忽略 */ }
    if (Date.now() - last < ONE_HOUR) return;
    const t = setTimeout(() => {
      setOpen(true);
      try { localStorage.setItem(KEY, String(Date.now())); } catch { /* 忽略 */ }
    }, 700);
    return () => clearTimeout(t);
  }, []);

  return <BoostDialog open={open} onClose={() => setOpen(false)} />;
}
