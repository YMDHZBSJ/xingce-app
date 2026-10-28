"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useCountUp } from "../lib/useCountUp";

export default function AnimatedNumber({
  value, suffix = "", prefix = "", className = "",
}: { value: number; suffix?: string; prefix?: string; className?: string }) {
  const n = useCountUp(value);
  return (
    <span className={`xc-num ${className}`}>
      {prefix}
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}
