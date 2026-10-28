"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// 深色底上可辨识的图表色板（图例文字沿用系列色，因此系列色必须够亮）
const COLORS = [
  "#F4701E",
  "#E94560",
  "#F59E0B",
  "#8B5CF6",
  "#10B981",
  "#EC4899",
  "#FB923C",
  "#6366F1",
];

const AXIS_TEXT = "#8B8177";
const GRID = "#F2E6DC";
const SURFACE = "#ffffff";

interface ChartData {
  name?: string;
  value?: number;
  [key: string]: string | number | undefined;
}

interface StatChartProps {
  type: "pie" | "bar" | "line";
  data: ChartData[];
  title?: string;
  height?: number;
  dataKey?: string;
  xKey?: string;
  lines?: { key: string; color: string; name: string }[];
}

const tooltipStyle = {
  backgroundColor: SURFACE,
  border: "1px solid #dfe5ef",
  borderRadius: "8px",
  color: "#17202f",
  fontSize: "12px",
} as const;

// 图例文字统一用前景色，避免继承深色系列色导致不可读
const legendFormatter = (value: string) => (
  <span style={{ color: AXIS_TEXT }}>{value}</span>
);

export default function StatChart({
  type,
  data,
  title,
  height = 300,
  dataKey = "value",
  xKey = "name",
  lines,
}: StatChartProps) {
  const renderChart = () => {
    switch (type) {
      case "pie":
        return (
          <ResponsiveContainer style={{ outline: "none" }} width="100%" height={height}>
            <PieChart style={{ outline: "none" }}>
              <Pie
                data={data}
                dataKey={dataKey}
                activeShape={false}
                isAnimationActive={false}
                style={{ outline: "none" }}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={height * 0.32}
                labelLine={false}
                label={({ name, value }: { name?: string; value?: number }) => (
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    fill={AXIS_TEXT}
                    fontSize={11}
                  >
                    {`${name} ${value}`}
                  </text>
                )}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                iconType="circle"
                formatter={legendFormatter}
                wrapperStyle={{ fontSize: "12px", paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data}
              margin={{ top: 10, right: 12, left: 4, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis
                dataKey={xKey}
                tickFormatter={(v) => String(v).replace(/^value$/, "")}
                tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                stroke={GRID}
                interval={0}
                angle={data.length > 8 ? -35 : 0}
                textAnchor={data.length > 8 ? "end" : "middle"}
                height={data.length > 8 ? 62 : 30}
              />
              <YAxis
                tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                stroke={GRID}
                width={44}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#23325655" }} />
              <Bar dataKey={dataKey} fill="#c9304b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={data}
              margin={{ top: 10, right: 12, left: 4, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis
                dataKey={xKey}
                tickFormatter={(v) => String(v).replace(/^value$/, "")}
                tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                stroke={GRID}
              />
              <YAxis
                tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                stroke={GRID}
                width={44}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                iconType="circle"
                formatter={legendFormatter}
                wrapperStyle={{ fontSize: "12px", paddingTop: 8 }}
              />
              {lines ? (
                lines.map((line) => (
                  <Line
                    key={line.key}
                    type="monotone"
                    dataKey={line.key}
                    stroke={line.color}
                    name={line.name}
                    strokeWidth={2}
                    dot={{ r: 3, fill: line.color }}
                    activeDot={{ r: 5 }}
                  />
                ))
              ) : (
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: COLORS[0] }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card p-4">
      {title && (
        <h2 className="text-base font-semibold text-[var(--fg)] mb-3">{title}</h2>
      )}
      {renderChart()}
    </div>
  );
}
