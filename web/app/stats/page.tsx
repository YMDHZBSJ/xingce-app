"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useState, useCallback } from "react";
import InlinePicker from "../components/InlinePicker";
import { onSoftRefresh } from "../lib/soft-refresh";
import BrandLoader from "../components/BrandLoader";
import { moduleStyle } from "../lib/module-icons";
import StatChart from "../components/StatChart";

interface StatsOptions {
  years: string[];
  regions: string[];
  modules: string[];
  qtypes: string[];
}

interface StatsData {
  totalQuestions: number;
  totalPapers: number;
  moduleStats: { module: string; count: number }[];
  qtypeStats: { qtype: string; count: number }[];
  yearStats: { year: string; count: number }[];
  regionStats: { region: string; count: number }[];
  crossStats?: any;
  options?: StatsOptions;
}

const fallbackModules = [
  "政治理论",
  "常识判断",
  "言语理解与表达",
  "数量关系",
  "判断推理",
  "资料分析",
];

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterQtype, setFilterQtype] = useState("");
  // 下拉选项只从接口拿一次，之后不随筛选收缩
  const [options, setOptions] = useState<StatsOptions>({
    years: [],
    regions: [],
    modules: fallbackModules,
    qtypes: [],
  });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterModule) params.set("module", filterModule);
      if (filterYear) params.set("year", filterYear);
      if (filterRegion) params.set("region", filterRegion);
      if (filterQtype) params.set("qtype", filterQtype);

      const res = await fetch(`/api/stats?${params.toString()}`);
      if (!res.ok) throw new Error("统计加载失败");
      const data = await res.json();
      setStats(data);
      if (data.options) {
        setOptions((prev) => ({
          years: data.options.years?.length ? data.options.years : prev.years,
          regions: data.options.regions?.length
            ? data.options.regions
            : prev.regions,
          modules: data.options.modules?.length
            ? data.options.modules
            : prev.modules,
          qtypes: data.options.qtypes?.length ? data.options.qtypes : prev.qtypes,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "统计加载失败");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [filterModule, filterYear, filterRegion, filterQtype]);


  useEffect(() => onSoftRefresh(fetchStats), [fetchStats]);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Prepare chart data
  const modulePieData =
    stats?.moduleStats?.map((m) => ({ name: m.module, value: m.count })) || [];
  const qtypeBarData =
    stats?.qtypeStats?.map((q) => ({ name: q.qtype, value: q.count })) || [];
  const yearLineData =
    stats?.yearStats?.map((y) => ({ year: `${y.year}年`, count: y.count })) || [];
  const regionBarData =
    stats?.regionStats?.map((r) => ({ name: r.region, value: r.count })) || [];

  return (
    <div className="space-y-6">
      <h1 className="xc-title">题型分析</h1>

      {/* Filters：全部为固定下拉，禁止手填 */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <InlinePicker
            value={filterModule}
            ariaLabel="选择模块"
            placeholder="全部模块"
            options={[{ value: "", label: "全部模块" }, ...options.modules.map((m) => ({ value: m, label: m }))]}
            onChange={setFilterModule}
            columns={2}
          />
          <InlinePicker
            value={filterQtype}
            ariaLabel="选择题型"
            placeholder="全部题型"
            options={[{ value: "", label: "全部题型" }, ...options.qtypes.map((q) => ({ value: q, label: q }))]}
            onChange={setFilterQtype}
            columns={2}
          />
          <InlinePicker
            value={filterYear}
            ariaLabel="选择年份"
            placeholder="全部年份"
            options={[{ value: "", label: "全部年份" }, ...options.years.map((y) => ({ value: y, label: `${y}年` }))]}
            onChange={setFilterYear}
            columns={3}
          />
          <InlinePicker
            value={filterRegion}
            ariaLabel="选择地区"
            placeholder="全部地区"
            options={[{ value: "", label: "全部地区" }, ...options.regions.map((r) => ({ value: r, label: r }))]}
            onChange={setFilterRegion}
            columns={3}
          />

          <button
            onClick={fetchStats}
            className="px-4 py-2 rounded-lg bg-[var(--accent-fill)] text-white text-sm font-medium hover:opacity-80 transition-smooth"
          >
            刷新统计
          </button>
          {(filterModule || filterYear || filterRegion || filterQtype) && (
            <button
              onClick={() => {
                setFilterModule("");
                setFilterYear("");
                setFilterRegion("");
                setFilterQtype("");
              }}
              className="px-3 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg-muted)] hover:border-[var(--accent)] transition-smooth"
            >
              重置筛选
            </button>
          )}
        </div>
      </div>

      {/* 模块分布：环形图 + 图例 */}
      {stats && !loading && (() => {
        const mods = (stats.moduleStats || []).slice(0, 5);
        const total = mods.reduce((a, b) => a + b.count, 0) || 1;
        const palette = ["#F4701E", "#E94560", "#F59E0B", "#8B5CF6", "#10B981"];
        let acc = 0;
        const stops = mods.map((m, i) => {
          const from = (acc / total) * 100;
          acc += m.count;
          const to = (acc / total) * 100;
          return `${palette[i % palette.length]} ${from}% ${to}%`;
        }).join(", ");
        return (
          <div className="card">
            <div className="card-t">模块分布</div>
            <div className="flex items-center gap-5">
              <div
                className="relative flex h-[132px] w-[132px] shrink-0 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(${stops})` }}
              >
                <div className="absolute h-[88px] w-[88px] rounded-full bg-[var(--surface)]" />
                <div className="relative text-center">
                  <b className="block text-[19px] font-extrabold">
                    {(stats.totalQuestions ?? 0).toLocaleString()}
                  </b>
                  <span className="text-[10px] text-[var(--fg-muted)]">总题量</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 text-[12px] text-[var(--fg-2)]">
                {mods.map((m, i) => (
                  <div key={m.module} className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px]"
                      style={{ background: `${palette[i % palette.length]}1A` }}
                    >
                      {moduleStyle(m.module).icon}
                    </span>
                    <span className="truncate">{m.module}</span>
                    <span className="ml-auto shrink-0 font-semibold">{m.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 年份趋势 */}
      {stats && !loading && Array.isArray(stats.yearStats) && stats.yearStats.length > 0 && (() => {
        const max = Math.max(...stats.yearStats.map((y) => y.count), 1);
        return (
          <div className="card">
            <div className="card-t">年份趋势</div>
            <div className="space-y-2.5">
              {stats.yearStats.map((y) => (
                <div key={y.year}>
                  <div className="mb-1.5 flex justify-between text-[12px] font-semibold text-[var(--fg-2)]">
                    <span>{y.year} 年</span>
                    <span>{y.count.toLocaleString()} 题</span>
                  </div>
                  <div className="h-[9px] overflow-hidden rounded-full bg-[var(--track)]">
                    <div className="h-full rounded-full" style={{ width: `${(y.count / max) * 100}%`, background: "var(--grad)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {loading && (
        <div className="card">
          <BrandLoader text="正在汇总题库数据…" />
        </div>
      )}

      {error && !loading && (
        <div className="card p-4 border-[var(--accent)]">
          <p className="text-sm text-[var(--accent-text)]">{error}</p>
          <p className="text-sm text-[var(--fg-muted)] mt-2">请确认API服务已启动。</p>
        </div>
      )}

      {/* Charts */}
      {!loading && !error && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Module pie chart */}
          {modulePieData.length > 0 && (
            <StatChart
              type="pie"
              data={modulePieData}
              title="各模块题数分布"
              height={300}
            />
          )}

        </div>
      )}
    </div>
  );
}