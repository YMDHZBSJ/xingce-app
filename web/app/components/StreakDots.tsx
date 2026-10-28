"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useState } from "react";
import { recentDays } from "../lib/history";

export default function StreakDots() {
  const [days, setDays] = useState<{ label: string; active: boolean; today: boolean }[]>([]);
  useEffect(() => { setDays(recentDays()); }, []);
  return (
    <div className="xc-streak">
      {days.map((d, i) => (
        <div key={i} className={`xc-dot ${d.active ? "on" : ""} ${d.today ? "today" : ""}`}>
          {d.label}
        </div>
      ))}
    </div>
  );
}
