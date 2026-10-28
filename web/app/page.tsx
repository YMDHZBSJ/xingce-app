"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import AnimatedNumber from "./components/AnimatedNumber";
import ProgressRing from "./components/ProgressRing";
import StreakDots from "./components/StreakDots";
import Sparkline from "./components/Sparkline";
import { loadHistory, todayCount } from "./lib/history";
import { onSoftRefresh } from "./lib/soft-refresh";
import { moduleStyle } from "./lib/module-icons";
import { loadSettings } from "./lib/settings";
import { getCountdown, type CountdownInfo } from "./lib/exam-countdown";

interface WrongEntry { id: number; count: number; lastAt?: number }
interface DailyTip { text: string }

const TIPS = [
  "资料分析先看问题再读材料，带着关键词定位，能省一半时间。",
  "图形推理按「元素组成」分流：相同看位置、相似看样式、不同看数量与属性。",
  "逻辑填空先找语境呼应词，再看搭配与程度，别急着凭语感。",
  "数量关系优先做工程、行程、利润三类模型，剩下按选项代入。",
  "常识判断遇到「一定/必须/全部」这类绝对表述，多半是错的。",
  "片段阅读抓中心句：首尾句、转折词后、结论词后。",
  "错题当天过一遍，三天后再做一次，才真正记得住。",
];

const goal = 20;

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，早点休息";
  if (h < 11) return "早上好，开个好头";
  if (h < 14) return "中午好，来两道";
  if (h < 19) return "下午好，继续冲";
  return "晚上好，再练一会儿";
}

export default function Home() {
  const [today, setToday] = useState(0);
  const [trend, setTrend] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [yesterdayWrong, setYesterdayWrong] = useState<{ n: number; top: string }>({ n: 0, top: "" });
  const [daily, setDaily] = useState<{ current: number; total: number } | null>(null);
  const [dailyDone, setDailyDone] = useState(false);
  const [goal, setGoal] = useState(20);
  const [cd, setCd] = useState<CountdownInfo | null>(null);
  const [total, setTotal] = useState(22298);
  const [tip, setTip] = useState<DailyTip>({ text: TIPS[0] });
  const [moduleProgress, setModuleProgress] = useState<{ module: string; done: number; total: number }[]>([]);

  // 考试倒计时：挂载即计算，每 30 秒刷新
  useEffect(() => {
    const tick = () => setCd(getCountdown());
    tick();
    const t = setInterval(tick, 30 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      // 今日进度 / 趋势 / 打卡
      setToday(todayCount());
      const hist = loadHistory();
      setTrend(hist.slice(-7).map((r) => r.accuracy));
      const days = new Set(hist.map((r) => new Date(r.at).toDateString()));
      setStreak(days.size);

      // 今日建议（按天轮换）
      setTip({ text: TIPS[Math.floor(Date.now() / 86400000) % TIPS.length] });

      // 今日练习（独立模块）：是否有未完成进度 / 今天是否已完成
      try {
        const raw = localStorage.getItem("dailySession");
        const today = new Date().toDateString();
        if (raw) {
          const s = JSON.parse(raw);
          if (s?.date === today && s?.ids?.length) {
            setDaily({ current: (s.index ?? 0) + 1, total: s.ids.length });
          }
        }
        const done = JSON.parse(localStorage.getItem("dailyDone") || "null");
        setDailyDone(!!done && done.date === today);
      } catch { /* 忽略 */ }

      // 个人设置：每日目标题数
      setGoal(loadSettings().dailyGoal);

      // 昨日错题回顾
      try {
        const list: WrongEntry[] = JSON.parse(localStorage.getItem("wrongStats") || "[]");
        const y = new Date(); y.setDate(y.getDate() - 1);
        const key = y.toDateString();
        const yList = list.filter((w) => new Date(w.lastAt || 0).toDateString() === key);
        if (yList.length) {
          const ids = yList.slice(0, 30).map((w) => w.id);
          let top = "";
          try {
            const res = await fetch(`/api/questions/batch?ids=${ids.join(",")}`);
            if (res.ok) {
              const d = await res.json();
              const cnt: Record<string, number> = {};
              (d.items || []).forEach((q: { module?: string }) => {
                if (q?.module) cnt[q.module] = (cnt[q.module] || 0) + 1;
              });
              top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
            }
          } catch { /* 忽略 */ }
          setYesterdayWrong({ n: yList.length, top });
        }
      } catch { /* 忽略 */ }

      // 六大模块刷题进度：已做题（按模块） / 模块题库总量
      try {
        const times = JSON.parse(localStorage.getItem("questionTimeLast") || "{}");
        const ids = Object.keys(times).map(Number).filter((n) => Number.isFinite(n)).slice(-300);
        const doneByModule: Record<string, number> = {};
        if (ids.length) {
          for (let i = 0; i < ids.length; i += 100) {
            const chunk = ids.slice(i, i + 100);
            try {
              const r = await fetch(`/api/questions/batch?ids=${chunk.join(",")}`);
              if (r.ok) {
                const d = await r.json();
                (d.items || []).forEach((q: { module?: string }) => {
                  if (q?.module) doneByModule[q.module] = (doneByModule[q.module] || 0) + 1;
                });
              }
            } catch { /* 忽略 */ }
          }
        }
        const st = await fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const totals: Record<string, number> = {};
        (st?.moduleStats || []).forEach((m: { module: string; count: number }) => {
          totals[m.module] = m.count;
        });
        const order = ["判断推理", "言语理解与表达", "资料分析", "常识判断", "数量关系", "政治理论"];
        setModuleProgress(order.filter((m) => totals[m]).map((m) => ({
          module: m,
          done: doneByModule[m] || 0,
          total: totals[m] || 0,
        })));
      } catch { /* 忽略 */ }

      // 题库总量
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const d = await res.json();
          if (d?.totalQuestions) setTotal(d.totalQuestions);
        }
      } catch { /* 忽略 */ }
    };
    load();
    return onSoftRefresh(load);
  }, []);

  const remain = Math.max(0, goal - today);

  return (
    <div className="xc-fade pb-4">
      {/* 顶部问候 + 打气 */}
      <div className="flex items-start justify-between pt-3">
        <div>
          <div className="xc-title">{greeting()} 🎯</div>
          <div className="xc-sub">
            近 5 年真题 · <AnimatedNumber value={total} /> 题 · 已连续 {streak} 天
          </div>
        </div>
        <Link
          href="/search"
          aria-label="搜索"
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
          style={{ background: "var(--grad)", boxShadow: "0 10px 22px -10px rgba(233,69,96,.8)" }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.2-3.2" />
          </svg>
        </Link>
      </div>

      {/* 考试倒计时 */}
      {cd && cd.state !== "ended" && (
        <div
          className={`mt-3 flex items-center gap-3 rounded-2xl px-4 py-3 ${cd.urgent ? "xc-countdown-urgent" : ""}`}
          style={{
            background: cd.urgent
              ? "linear-gradient(135deg,#DC2626 0%,#E94560 100%)"
              : "linear-gradient(135deg,#F4701E 0%,#E94560 100%)",
            boxShadow: cd.urgent
              ? "0 14px 30px -14px rgba(220,38,38,.85)"
              : "0 14px 30px -16px rgba(233,69,96,.7)",
          }}
        >
          <span className="text-[20px]">{cd.state === "running" ? "🔴" : "⏳"}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11.5px] font-semibold text-white/80">
                {cd.state === "running" ? "考试" : "距行测考试"}
              </span>
              {cd.state === "upcoming" && (
                <span className="text-[19px] font-extrabold leading-none text-white">{cd.primary}</span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[10.5px] text-white/85">{cd.secondary}</div>
          </div>
        </div>
      )}

      {/* 今日练习 */}
      <div
        onClick={() => { window.location.href = "/daily"; }}
        className="relative mt-3 block cursor-pointer overflow-hidden rounded-[26px] p-5 text-white xc-press"
        style={{ background: "var(--grad)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full" style={{ background: "rgba(255,255,255,.16)" }} />
        <div className="relative">
          <div className="text-[11px] font-bold tracking-[.22em] opacity-85">今 日 练 习</div>
          <h2 className="mt-1.5 text-[21px] font-extrabold">
            {daily ? `继续 · 第 ${daily.current}/${daily.total} 题` : dailyDone ? "今日已完成" : "随机挑战 · 10 题"}
          </h2>
          <p className="mt-1 text-[12px] opacity-90">
            {daily ? "上次的进度还在，接着做完吧" : dailyDone ? "今日目标已完成，还想练就再来一组" : "全模块随机抽题 · 计时 · 独立计分"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-[14px] font-extrabold text-[#E94560]">
              {daily ? "继续练习 →" : dailyDone ? "再来 10 题 →" : "开始 10 题 →"}
            </span>
            <Link
              href="/daily?count=3"
              className="rounded-full px-3.5 py-2 text-[12.5px] font-bold text-white"
              style={{ background: "rgba(255,255,255,.22)", border: "1px solid rgba(255,255,255,.35)" }}
              onClick={(e) => e.stopPropagation()}
            >
              只有 3 分钟？做 3 题
            </Link>
          </div>
        </div>
      </div>

      {/* 今日达成目标 */}
      <div className="xc-card-grad mt-3 flex items-center gap-4">
        <ProgressRing value={Math.min(today, goal)} total={goal} size={92}>
          <b className="block text-[19px] font-extrabold xc-grad-text">{today}</b>
          <span className="text-[10px] text-[var(--fg-muted)]">/ {goal} 题</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold">今日达成目标</span>
            <span className="xc-badge-gray rounded-lg px-2 py-0.5 text-[10px] font-bold">
              {remain === 0 ? "已达成 🎉" : `还差 ${remain} 题`}
            </span>
          </div>
          <StreakDots />
          <div className="mt-1">
            {trend.length >= 2 ? (
              <>
                <Sparkline values={trend} height={40} />
                <p className="text-[10px] text-[var(--fg-muted)]">
                  最近 {trend.length} 次练习正确率 · {Math.min(...trend)}%~{Math.max(...trend)}%
                </p>
              </>
            ) : (
              <p className="text-[10.5px] text-[var(--fg-muted)]">完成 2 次练习后显示正确率趋势</p>
            )}
          </div>
        </div>
      </div>

      {/* 昨日错题回顾 */}
      <div className="xc-card mt-3">
        <div className="flex items-center justify-between">
          <div className="card-t" style={{ margin: 0 }}>昨日错题回顾</div>
          <Link href="/wrong" className="text-[11.5px] font-bold text-[var(--accent-text)]">去复习 ›</Link>
        </div>
        {yesterdayWrong.n > 0 ? (
          <div className="mt-2 flex items-center gap-3">
            <span className="xc-icon-box" style={{ fontSize: 20 }}>📕</span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold">昨天错了 {yesterdayWrong.n} 道题</p>
              <p className="text-[11.5px] text-[var(--fg-muted)]">
                {yesterdayWrong.top ? `集中在「${yesterdayWrong.top}」${moduleStyle(yesterdayWrong.top).icon}` : "建议今天优先重做一遍"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-[var(--fg-muted)]">昨天没有错题记录，状态不错，继续保持。</p>
        )}
      </div>

      {/* 今日建议 */}
      <div className="xc-card mt-3">
        <div className="flex items-center justify-between">
          <div className="card-t" style={{ margin: 0 }}>今日建议</div>
          <span className="xc-badge">每天一条</span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-2)]">{tip.text}</p>
      </div>

      {/* 六大模块刷题进度 */}
      {moduleProgress.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="card-t" style={{ margin: 0 }}>模块进度</div>
            <span className="text-[10.5px] text-[var(--fg-muted)]">点击进入专练</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {moduleProgress.map((m) => {
              const st = moduleStyle(m.module);
              const pct = m.total ? Math.min(100, Math.round((m.done / m.total) * 100)) : 0;
              return (
                <Link
                  key={m.module}
                  href={`/practice?module=${encodeURIComponent(m.module)}`}
                  className="xc-card-sm xc-press block"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[13px]"
                      style={{ background: `${st.color}1A` }}
                    >
                      {st.icon}
                    </span>
                    <span className="truncate text-[12.5px] font-bold text-[var(--fg-2)]">{m.module}</span>
                    <span className="ml-auto text-[10.5px] font-bold tabular-nums text-[var(--accent-text)]">{pct}%</span>
                  </div>
                  <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[var(--track)]">
                    <div className="h-full rounded-full xc-grow" style={{ width: `${Math.max(2, pct)}%`, background: "var(--grad)" }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-[var(--fg-muted)] tabular-nums">
                    <span>已做 {m.done}</span>
                    <span>共 {m.total}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
