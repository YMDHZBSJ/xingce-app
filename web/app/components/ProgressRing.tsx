"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
export default function ProgressRing({
  value, total, size = 92, stroke = 9, children,
}: { value: number; total: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <div className="xc-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="xcRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F4701E" />
            <stop offset="100%" stopColor="#E94560" />
          </linearGradient>
        </defs>
        <circle className="trace" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="bar" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="label">{children}</div>
    </div>
  );
}
