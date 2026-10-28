"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useMemo, useState } from "react";
import { loadHistory } from "../lib/history";
import { reasonStats, reasonAdvice } from "../lib/mistake-reasons";
import Link from "next/link";
import Radar from "../components/Radar";
import EmptyState from "../components/EmptyState";
import AnimatedNumber from "../components/AnimatedNumber";

interface WrongEntry { id: number; count: number; lastAt: number }
interface QMeta { id: number; module?: string; qtype?: string; stem?: string }
interface KpNode { id: number; name: string; module?: string; children?: KpNode[] }

/** 各模块的提分建议（基于花生十三方法体系整理的要点） */
const TIPS: Record<string, string[]> = {
  资料分析: ["先看问题再读材料，带着关键词定位", "数量级判题型：增长→基期/现期，比重→交叉", "速算用截位直除，分子分母同截三位", "限时训练：单题 45 秒内完成"],
  判断推理: ["图形推理先看元素组成：相同看位置、相似看样式、不同看数量/属性", "定义判断抓主体+行为+对象三要素，逐项排除", "逻辑判断翻译题干：如果…就…→ 前推后，只有…才…→ 后推前"],
  言语理解: ["逻辑填空先找语境呼应，再看搭配与程度", "片段阅读找中心句：首尾句、转折词后、结论词后", "选项排除：偷换概念、绝对表述、无中生有"],
  数量关系: ["优先做工程/行程/利润三类模型题", "选项代入法比重算更快", "实在没思路先蒙，留时间给资料"],
  常识判断: ["抓绝对表述（一定/必须/全部）多为错误", "时政类按年份排除，常识类按常理判断", "单题不超过 30 秒"],
  政治理论: ["牢记重大会议表述与关键词对应", "背诵与理解结合，抓核心词", "错题整理成专题，反复过"],
};

export default function AnalyzePage() {
  const [wrong, setWrong] = useState<WrongEntry[]>([]);
  const [times, setTimes] = useState<Record<string, number>>({});
  const [examCount, setExamCount] = useState(0);
  const [meta, setMeta] = useState<Record<number, QMeta>>({});
  const [qkp, setQkp] = useState<Record<string, number[]>>({});
  const [kps, setKps] = useState<Record<number, KpNode>>({});
  const [loading, setLoading] = useState(true);
  const [totalPracticed, setTotalPracticed] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [reasons, setReasons] = useState<{ key: string; label: string; icon: string; count: number; pct: number }[]>([]);
  const [advice, setAdvice] = useState("");
  const [sourceStats, setSourceStats] = useState<{ name: string; count: number; accuracy: number }[]>([]);

  useEffect(() => {
    (async () => {
      let w: WrongEntry[] = [], t: Record<string, number> = {}, e = 0;
      try { w = JSON.parse(localStorage.getItem("wrongStats") || "[]"); } catch {}
      try { t = JSON.parse(localStorage.getItem("questionTimeLast") || "{}"); } catch {}
      try {
        const p = JSON.parse(localStorage.getItem("examPaperProgress") || "{}");
        e = Object.values(p || {}).filter((x) => (x as { submitted?: boolean }).submitted).length;
      } catch {}
      setWrong(Array.isArray(w) ? w : []);
      setTimes(t || {});
      setExamCount(e);

      // 合并所有来源：每日一练 / 题型专练 / 模拟考试
      const hist = loadHistory();
      const histAnswered = hist.reduce((a, r) => a + (r.answered || 0), 0);
      const examProg = JSON.parse(localStorage.getItem("examPaperProgress") || "{}") as Record<string, { answered?: number }>;
      const examAnswered = Object.values(examProg).reduce((a, p) => a + (p?.answered || 0), 0);
      setTotalPracticed(histAnswered + examAnswered);
      setHistoryCount(hist.length);

      // 来源分布：每日一练 / 题型专练 / 模拟考试
      const src: Record<string, { count: number; correct: number; answered: number }> = {};
      hist.forEach((r) => {
        const key = r.module || "题型专练";
        src[key] = src[key] || { count: 0, correct: 0, answered: 0 };
        src[key].count += r.answered || 0;
        src[key].correct += r.correct || 0;
        src[key].answered += r.answered || 0;
      });
      if (examAnswered > 0 && !src["模拟考试"]) src["模拟考试"] = { count: examAnswered, correct: 0, answered: examAnswered };
      setSourceStats(
        Object.entries(src).map(([name, v]) => ({
          name,
          count: v.count,
          accuracy: v.answered ? Math.round((v.correct / v.answered) * 100) : 0,
        }))
      );

      // 题目元信息（模块/题型）
      const ids = [...new Set([...(Array.isArray(w) ? w : []).map((x) => x.id), ...Object.keys(t).map(Number)])]
        .filter((n) => Number.isFinite(n))
        .slice(0, 400);
      const map: Record<number, QMeta> = {};
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        try {
          const r = await fetch(`/api/questions/batch?ids=${chunk.join(",")}`);
          if (r.ok) {
            const d = await r.json();
            (d.items || []).forEach((q: QMeta) => { if (q) map[q.id] = q; });
          }
        } catch {}
      }
      setMeta(map);

      // 考点映射
      try {
        const [r1, r2] = await Promise.all([fetch("/data/qkp.json"), fetch("/data/kp.json")]);
        if (r1.ok) setQkp(await r1.json());
        if (r2.ok) {
          const kd = await r2.json();
          const flat: Record<number, KpNode> = {};
          const walk = (ns: KpNode[]) => ns.forEach((n) => { flat[n.id] = n; walk(n.children || []); });
          walk(kd.items || []);
          setKps(flat);
        }
      } catch {}
      setReasons(reasonStats());
      setAdvice(reasonAdvice());
      setLoading(false);
    })();
  }, []);

  const practiced = Object.keys(times).length;

  const moduleStats = useMemo(() => {
    const m: Record<string, { wrong: number; total: number }> = {};
    const bump = (mod: string, key: "wrong" | "total") => {
      if (!mod) return;
      m[mod] = m[mod] || { wrong: 0, total: 0 };
      m[mod][key] += 1;
    };
    wrong.forEach((w) => bump(meta[w.id]?.module || "", "wrong"));
    Object.keys(times).forEach((id) => bump(meta[Number(id)]?.module || "", "total"));
    return Object.entries(m)
      .map(([module, v]) => ({ module, ...v, rate: v.total ? Math.round((1 - v.wrong / v.total) * 100) : 0 }))
      .sort((a, b) => b.wrong - a.wrong);
  }, [wrong, times, meta]);

  const kpStats = useMemo(() => {
    const c: Record<number, number> = {};
    wrong.forEach((w) => {
      (qkp[String(w.id)] || []).forEach((kid) => { c[kid] = (c[kid] || 0) + (w.count || 1); });
    });
    return Object.entries(c)
      .map(([id, n]) => ({ name: kps[Number(id)]?.name || `考点${id}`, module: kps[Number(id)]?.module || "", n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
  }, [wrong, qkp, kps]);

  const slowest = useMemo(() => {
    return Object.entries(times)
      .map(([id, s]) => ({ id: Number(id), s, q: meta[Number(id)] }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);
  }, [times, meta]);

  // 六维雷达（固定模块顺序，缺省 0）
  const radarItems = useMemo(() => {
    const order = ["言语理解与表达", "判断推理", "资料分析", "数量关系", "常识判断", "政治理论"];
    const m = new Map(moduleStats.map((x) => [x.module, x]));
    return order.map((name) => {
      const hit = m.get(name);
      const v = hit && hit.total ? hit.rate : 0;
      return { label: name.slice(0, 4), value: v };
    });
  }, [moduleStats]);

  // 用时直方图（秒 → 区间计数）
  const histogram = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    Object.values(times).forEach((s) => {
      if (s < 30) buckets[0]++;
      else if (s < 60) buckets[1]++;
      else if (s < 90) buckets[2]++;
      else if (s < 150) buckets[3]++;
      else buckets[4]++;
    });
    return { labels: ["<30", "30-60", "60-90", "90-150", "150+"], buckets };
  }, [times]);

  const weakest = moduleStats[0]?.module;
  const hasData = practiced > 0 || wrong.length > 0;

  return (
    <div className="xc-fade">
      <div className="pt-3">
        <div className="xc-title">学习分析</div>
        <div className="xc-sub">基于你的本地做题数据，离线生成</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {[
          { v: Math.max(totalPracticed, practiced), l: "练过题数" },
          { v: wrong.length, l: "错题数" },
          { v: examCount, l: "已交卷" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl bg-[var(--surface)] px-2 py-3 text-center" style={{ boxShadow: "var(--shadow-sm)" }}>
            <b className="xc-grad-text block text-[17px] font-extrabold"><AnimatedNumber value={s.v} /></b>
            <span className="text-[10.5px] text-[var(--fg-muted)]">{s.l}</span>
          </div>
        ))}
      </div>

      {!hasData && (
        <div className="xc-card mt-3">
          <EmptyState
            title="还没有做题数据"
            desc="做几组专练或一套模考，这里会出现薄弱模块、高频错点与用时分析"
            action={<Link href="/practice" className="xc-btn" style={{ padding: "0 22px" }}>去练几题</Link>}
          />
        </div>
      )}

      {reasons.length > 0 && (
        <div className="xc-card mt-3">
          <div className="card-t">错因画像</div>
          <div className="space-y-2">
            {reasons.map((r) => (
              <div key={r.key}>
                <div className="mb-1 flex justify-between text-[12px] font-semibold text-[var(--fg-2)]">
                  <span>{r.icon} {r.label}</span>
                  <span>{r.count} 次 · {r.pct}%</span>
                </div>
                <div className="h-[8px] overflow-hidden rounded-full bg-[var(--track)]">
                  <div className="h-full rounded-full xc-grow" style={{ width: `${Math.max(3, r.pct)}%`, background: "var(--grad)" }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 rounded-lg bg-[var(--chip)] p-2 text-[11.5px] leading-relaxed text-[var(--fg-2)]">{advice}</p>
        </div>
      )}

      {sourceStats.length > 0 && (
        <div className="xc-card mt-3">
          <div className="card-t">做题来源分布</div>
          <div className="space-y-2">
            {sourceStats.map((s) => {
              const max = Math.max(...sourceStats.map((x) => x.count), 1);
              return (
                <div key={s.name}>
                  <div className="mb-1 flex justify-between text-[12px] font-semibold text-[var(--fg-2)]">
                    <span>{s.name}</span>
                    <span>{s.count} 题{s.accuracy ? ` · ${s.accuracy}%` : ""}</span>
                  </div>
                  <div className="h-[8px] overflow-hidden rounded-full bg-[var(--track)]">
                    <div className="h-full rounded-full" style={{ width: `${(s.count / max) * 100}%`, background: "var(--grad)" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10.5px] text-[var(--fg-muted)]">统计范围：每日一练、题型专练、模拟考试交卷</p>
        </div>
      )}

      {hasData && (
        <div className="xc-card mt-3">
          <div className="card-t">模块能力雷达</div>
          <div className="flex justify-center">
            <Radar items={radarItems} />
          </div>
          <p className="mt-1 text-center text-[10.5px] text-[var(--fg-muted)]">基于已做题目的错误分布估算，做题越多越准</p>
        </div>
      )}

      {(histogram.buckets.some((b) => b > 0)) && (
        <div className="xc-card mt-3">
          <div className="card-t">用时分布</div>
          <div className="xc-hist">
            {histogram.buckets.map((b, i) => {
              const max = Math.max(...histogram.buckets, 1);
              return <i key={i} className="xc-grow" style={{ height: `${Math.max(6, (b / max) * 100)}%` }} />;
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-[var(--fg-muted)]">
            {histogram.labels.map((l) => <span key={l}>{l}s</span>)}
          </div>
        </div>
      )}

      {moduleStats.length > 0 && (
        <div className="xc-card mt-3">
          <div className="card-t">模块薄弱排行</div>
          <div className="space-y-2.5">
            {moduleStats.map((m) => {
              const max = Math.max(...moduleStats.map((x) => x.wrong), 1);
              return (
                <div key={m.module}>
                  <div className="mb-1 flex justify-between text-[12px] font-semibold text-[var(--fg-2)]">
                    <span>{m.module}</span>
                    <span>{m.wrong} 道错题 · 预计正确率 {m.rate}%</span>
                  </div>
                  <div className="h-[9px] overflow-hidden rounded-full bg-[var(--track)]">
                    <div className="h-full rounded-full" style={{ width: `${(m.wrong / max) * 100}%`, background: "var(--grad)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {kpStats.length > 0 && (
        <div className="xc-card mt-3">
          <div className="card-t">高频错题考点</div>
          <div className="flex flex-wrap gap-2">
            {kpStats.map((k) => (
              <span key={k.name} className="xc-chip">
                {k.name}
                <b className="text-[var(--accent-text)]">{k.n}</b>
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-[var(--fg-muted)]">偏旁数字为该考点的错误次数累计，优先攻这些点</p>
        </div>
      )}

      {slowest.length > 0 && (
        <div className="xc-card mt-3">
          <div className="card-t">单题用时最长</div>
          <div className="space-y-2">
            {slowest.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="truncate text-[var(--fg-2)]">
                  {(x.q?.stem || "题目").replace(/<[^>]+>/g, "").slice(0, 24)}…
                </span>
                <b className="shrink-0 text-[var(--accent-text)]">{x.s}s</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {weakest && TIPS[weakest] && (
        <div className="xc-card mt-3">
          <div className="card-t">提分建议 · {weakest}</div>
          <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-[var(--fg-2)]">
            {TIPS[weakest].map((t) => (
              <li key={t} className="flex gap-1.5"><span className="text-[var(--brand-1)]">•</span><span>{t}</span></li>
            ))}
          </ul>
        </div>
      )}

      <div className="xc-card-grad mt-3">
        <div className="flex items-center justify-between">
          <div className="card-t" style={{ margin: 0 }}>今日建议</div>
          <span className="xc-badge">每天一条</span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-2)]">
          {(() => {
            const pool = [
              "资料分析先看问题再读材料，带着关键词定位，能省一半时间。",
              "图形推理按「元素组成」分流：相同看位置、相似看样式、不同看数量与属性。",
              "逻辑填空先找语境呼应词，再看搭配与程度，别急着凭语感。",
              "数量关系优先做工程、行程、利润三类模型，剩下按选项代入。",
              "常识判断遇到「一定/必须/全部」这类绝对表述，多半是错的。",
              "片段阅读抓中心句：首尾句、转折词后、结论词后。",
              "错题当天过一遍，三天后再做一次，才真正记住。",
            ];
            const idx = Math.floor(Date.now() / 86400000) % pool.length;
            return pool[idx];
          })()}
        </p>
      </div>

      <div className="mt-3 text-center text-[11px] text-[var(--fg-muted)]">
        分析完全在本机计算，不联网、不上传
      </div>
    </div>
  );
}
