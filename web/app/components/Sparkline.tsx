"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
export default function Sparkline({ values, height = 46 }: { values: number[]; height?: number }) {
  if (values.length < 2) return null;
  const w = 280, h = height, pad = 4;
  const max = Math.max(...values, 100), min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (values.length - 1);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${d} L${pts[pts.length - 1][0].toFixed(1)} ${h - pad} L${pts[0][0].toFixed(1)} ${h - pad} Z`;
  return (
    <svg className="xc-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="xcSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E94560" stopOpacity=".26" />
          <stop offset="100%" stopColor="#F4701E" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="xcSparkLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F4701E" />
          <stop offset="100%" stopColor="#E94560" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#xcSparkFill)" />
      <path d={d} fill="none" stroke="url(#xcSparkLine)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
