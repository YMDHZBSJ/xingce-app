"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
/** 六维雷达图（模块正确率） */
export default function Radar({
  items, size = 220,
}: { items: { label: string; value: number }[]; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 30;
  const n = Math.max(3, items.length);
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, ratio: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * r * ratio, cy + Math.sin(a) * r * ratio] as const;
  };
  const rings = [0.25, 0.5, 0.75, 1];

  const dataPts = items.map((it, i) => pt(i, Math.max(0.06, Math.min(1, it.value / 100))));
  const dataPath = dataPts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <defs>
        <linearGradient id="xcRadarFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4701E" stopOpacity=".38" />
          <stop offset="100%" stopColor="#E94560" stopOpacity=".30" />
        </linearGradient>
      </defs>
      {rings.map((rr) => (
        <polygon
          key={rr}
          points={items.map((_, i) => pt(i, rr).map((v) => v.toFixed(1)).join(",")).join(" ")}
          fill="none" stroke="rgba(244,112,30,.16)" strokeWidth="1"
        />
      ))}
      {items.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(244,112,30,.14)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill="url(#xcRadarFill)" stroke="#E94560" strokeWidth="1.8" strokeLinejoin="round" />
      {dataPts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#E94560" />)}
      {items.map((it, i) => {
        const [x, y] = pt(i, 1.17);
        return (
          <text
            key={it.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fill="var(--fg-muted)" fontWeight="600"
          >
            {it.label.length > 4 ? it.label.slice(0, 4) : it.label}
          </text>
        );
      })}
    </svg>
  );
}
