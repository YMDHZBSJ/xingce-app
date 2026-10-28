"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 今日复习（间隔重复 + 一题三练）
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QuestionCard, { type Question } from "../components/QuestionCard";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { dueNow, reviewList, recordReview } from "../lib/spaced-repetition";

export default function ReviewPage() {
  const [phase, setPhase] = useState<"list" | "drill">("list");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [due, setDue] = useState<{ id: number; stage: number }[]>([]);
  const [all, setAll] = useState<{ id: number; stage: number }[]>([]);
  const [meta, setMeta] = useState<Record<number, { module?: string; qtype?: string; stem?: string }>>({});

  useEffect(() => {
    const d = dueNow().map((x) => ({ id: x.id, stage: x.stage }));
    setDue(d);
    setAll(reviewList().map((x) => ({ id: x.id, stage: x.stage })));
  }, []);

  // 拉取题目摘要，便于识别
  useEffect(() => {
    const ids = all.map((x) => x.id).slice(0, 20);
    if (!ids.length) return;
    (async () => {
      try {
        const res = await fetch(`/api/questions/batch?ids=${ids.join(",")}`);
        const d = res.ok ? await res.json() : { items: [] };
        const m: Record<number, { module?: string; qtype?: string; stem?: string }> = {};
        (d.items || []).forEach((q: { id: number; module?: string; qtype?: string; stem?: string }) => {
          m[q.id] = { module: q.module, qtype: q.qtype, stem: (q.stem || "").replace(/<[^>]+>/g, "").slice(0, 46) };
        });
        setMeta(m);
      } catch { /* 忽略 */ }
    })();
  }, [all]);

  const start = async () => {
    const ids = due.map((x) => x.id).slice(0, 10);
    if (!ids.length) return;
    try {
      const res = await fetch(`/api/questions/batch?ids=${ids.join(",")}`);
      const d = res.ok ? await res.json() : { items: [] };
      setQuestions((d.items || []).filter(Boolean));
      setIndex(0);
      setPicked({});
      setRevealed({});
      setPhase("drill");
    } catch { /* 忽略 */ }
  };

  const q = questions[index];
  const ans = q ? picked[String(q.id)] : undefined;
  const correct = q ? String(q.answer ?? "").trim() : "";
  const isRight = ans === correct;

  const choose = (label: string) => {
    if (!q || ans) return;
    setPicked((p) => ({ ...p, [String(q.id)]: label }));
    recordReview(q.id, label === correct);
    setRevealed((r) => ({ ...r, [String(q.id)]: true }));
  };

  const next = () => {
    if (index < questions.length - 1) setIndex(index + 1);
    else {
      const d = dueNow().map((x) => ({ id: x.id, stage: x.stage }));
      setDue(d);
      setAll(reviewList().map((x) => ({ id: x.id, stage: x.stage })));
      setPhase("list");
    }
  };

  const stageLabel = (s: number) => ["第 1 次复习", "第 2 次复习", "第 3 次复习"][s] || "待复习";

  return (
    <div className="xc-fade pb-4">
      <div className="pt-3">
        <div className="xc-title">今日复习</div>
        <div className="xc-sub">按遗忘曲线安排 · 一题三练，连对 3 次即掌握</div>
      </div>

      {phase === "list" && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {[
              { v: due.length, l: "今日待复习" },
              { v: all.length, l: "队列中" },
              { v: Math.max(0, all.length - due.length), l: "未来到期" },
            ].map((s) => (
              <div key={s.l} className="xc-stat">
                <b className="block text-[18px] font-extrabold xc-grad-text">{s.v}</b>
                <span className="text-[10.5px] text-[var(--fg-muted)]">{s.l}</span>
              </div>
            ))}
          </div>

          {all.length === 0 ? (
            <div className="xc-card mt-3">
              <EmptyState
                title="还没有待复习的题"
                desc="答错的题会自动进入复习队列，答错的题 5 分钟后、1 天、3 天、7 天后各提醒一次"
                action={<Link href="/practice" className="xc-btn" style={{ padding: "0 22px" }}>去练题</Link>}
              />
            </div>
          ) : (
            <div className="xc-card mt-3">
              <div className="card-t">复习队列</div>
              <div className="space-y-1.5">
                {all.slice(0, 12).map((x) => (
                  <div key={x.id} className="flex items-start justify-between gap-2 text-[12px]">
                    <span className="min-w-0">
                      <span className="font-semibold text-[var(--accent-text)]">{meta[x.id]?.module || "题目"}</span>
                      <span className="ml-1.5 text-[10.5px] text-[var(--fg-muted)]">{meta[x.id]?.qtype || ""}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-[var(--fg-2)]">
                        {meta[x.id]?.stem || `题目 #${x.id}`}…
                      </span>
                    </span>
                    <span className="shrink-0 text-[10.5px] text-[var(--fg-muted)]">{stageLabel(x.stage)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {due.length > 0 && (
            <button onClick={start} className="xc-btn mt-3 w-full">
              开始复习（{Math.min(10, due.length)} 题）
            </button>
          )}
        </>
      )}

      {phase === "drill" && q && (
        <>
          <div className="card mt-3 p-3">
            <div className="flex items-center justify-between">
              <button onClick={() => setPhase("list")} aria-label="返回" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)]">
                <Icon name="arrow-left" size={16} />
              </button>
              <div className="flex items-center gap-1.5 text-[12px]">
                <span className="font-bold tabular-nums text-[var(--accent-text)]">{index + 1}</span>
                <span className="tabular-nums text-[var(--fg-muted)]">/ {questions.length}</span>
              </div>
              <span className="text-[11px] font-semibold text-[var(--fg-muted)]">
                复习中
              </span>
            </div>
          </div>

          <div className="mt-3">
            <QuestionCard
              key={q.id}
              question={q}
              showAnswer={!!revealed[q.id]}
              hideToggle
              markCorrect={!!revealed[q.id]}
              onAnswerSelect={(_, label) => choose(label)}
              selectedAnswer={ans}
            />
          </div>

          <div className="mt-3 flex gap-2.5">
            {!ans ? (
              <p className="flex-1 text-center text-[12px] text-[var(--fg-muted)]">选择答案后自动判定</p>
            ) : (
              <p className={`flex-1 text-center text-[12px] font-bold ${isRight ? "text-[var(--ok)]" : "text-[var(--accent-text)]"}`}>
                {isRight ? `答对了 · 下次复习延后 ${["1 天", "3 天", "7 天"][Math.min(2, 0)]}` : "答错了 · 明天再来一次"}
              </p>
            )}
            <button onClick={next} className="xc-btn" style={{ padding: "0 22px" }}>
              {index < questions.length - 1 ? "下一题" : "完成"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
