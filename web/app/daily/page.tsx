"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 今日练习：独立模块，随机 10 题，与题型专练完全隔离
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QuestionModal from "../components/QuestionModal";
import RelatedQuestions from "../components/RelatedQuestions";
import QuestionCard, { type Question } from "../components/QuestionCard";
import Icon from "../components/Icon";
import ConfirmDialog from "../components/ConfirmDialog";
import ReasonSheet from "../components/ReasonSheet";
import { enqueueReview } from "../lib/spaced-repetition";
import DraggableTimer from "../components/DraggableTimer";
import QuestionNav from "../components/QuestionNav";
import SwipeArea from "../components/SwipeArea";
import QuestionTimer from "../components/QuestionTimer";
import FixedLayer from "../components/FixedLayer";
import { addPracticeRecord } from "../lib/history";

const KEY = "dailySession";
const DONE_KEY = "dailyDone";
const DEFAULT_COUNT = 10;
/** 支持 /daily?count=3 进入「轻量三题」 */
function readCount(): number {
  if (typeof window === "undefined") return DEFAULT_COUNT;
  const n = Number(new URLSearchParams(window.location.search).get("count")) || 0;
  return n === 3 || n === 5 || n === 10 ? n : DEFAULT_COUNT;
}

interface DailySession {
  date: string;
  ids: number[];
  index: number;
  answers: Record<string, string>;
  marked: number[];
  totalSec: number;
}

const todayKey = () => new Date().toDateString();

export default function DailyPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [detailId, setDetailId] = useState<number | null>(null);
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"quiz" | "result">("quiz");
  const [totalSec, setTotalSec] = useState(0);
  const [qSec, setQSec] = useState(0);
  const [exitAsk, setExitAsk] = useState(false);
  const [submitAsk, setSubmitAsk] = useState(false);
  const running = useRef(true);

  // 计时
  useEffect(() => {
    const t = setInterval(() => {
      if (!running.current || phase !== "quiz") return;
      setTotalSec((s) => s + 1);
      setQSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const save = useCallback((patch: Partial<DailySession>) => {
    try {
      const base: DailySession = {
        date: todayKey(), ids: questions.map((q) => q.id), index, answers, marked: [...marked], totalSec,
        ...patch,
      };
      localStorage.setItem(KEY, JSON.stringify(base));
    } catch { /* 忽略 */ }
  }, [questions, index, answers, marked, totalSec]);

  useEffect(() => { if (questions.length) save({}); }, [index, answers, marked, questions.length, save]);

  // 载入题目（同一天有进度则恢复）
  useEffect(() => {
    (async () => {
      let restored = false;
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const s: DailySession = JSON.parse(raw);
          if (s?.date === todayKey() && s.ids?.length) {
            const res = await fetch(`/api/questions/batch?ids=${s.ids.join(",")}`);
            if (res.ok) {
              const d = await res.json();
              const list: Question[] = (d.items || []).filter(Boolean);
              if (list.length === s.ids.length) {
                setQuestions(list);
                setIndex(Math.min(s.index || 0, list.length - 1));
                setAnswers(s.answers || {});
                setMarked(new Set(s.marked || []));
                setTotalSec(s.totalSec || 0);
                restored = true;
              }
            }
          }
        }
      } catch { /* 忽略 */ }

      if (!restored) {
        try {
          const res = await fetch(`/api/questions?random=true&pageSize=${readCount()}`);
          const d = res.ok ? await res.json() : { items: [] };
          setQuestions(d.items || []);
        } catch { /* 忽略 */ }
      }
      setLoading(false);
    })();
  }, []);

  const q = questions[index];
  const answered = q ? answers[String(q.id)] : undefined;
  const correctAnswer = q ? String(q.answer ?? "").trim() : "";
  const answeredCount = Object.keys(answers).length;
  const correctCount = useMemo(
    () => questions.filter((x) => answers[String(x.id)] === String(x.answer ?? "").trim()).length,
    [questions, answers]
  );

  const choose = (label: string) => {
    if (!q || answered) return;
    setAnswers((prev) => ({ ...prev, [String(q.id)]: label }));
    if (label !== String(q.answer ?? "").trim()) { enqueueReview(q.id); setReasonFor(q.id); }
  };

  const submit = () => {
    setSubmitAsk(false);
    running.current = false;
    setPhase("result");
    try {
      const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
      addPracticeRecord({ total: questions.length, answered: answeredCount, correct: correctCount, accuracy, module: "每日一练" });
      localStorage.setItem(DONE_KEY, JSON.stringify({
        date: todayKey(), total: questions.length, correct: correctCount, accuracy, at: Date.now(),
      }));
      localStorage.removeItem(KEY);
    } catch { /* 忽略 */ }
  };

  const restart = () => {
    try { localStorage.removeItem(KEY); } catch { /* 忽略 */ }
    setPhase("quiz");
    setQuestions([]);
    setAnswers({});
    setRevealed(new Set());
    setMarked(new Set());
    setIndex(0);
    setTotalSec(0);
    setQSec(0);
    setLoading(true);
    // 直接在当前页重新抽题（不跳转、不回首页）
    (async () => {
      try {
        const res = await fetch(`/api/questions?random=true&pageSize=${readCount()}`);
        const d = res.ok ? await res.json() : { items: [] };
        setQuestions(d.items || []);
      } catch { /* 忽略 */ }
      setLoading(false);
    })();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="xc-loader" />
        <span className="text-xs text-[var(--fg-muted)]">正在抽题…</span>
      </div>
    );
  }

  if (phase === "result") {
    const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
    return (
      <div className="xc-fade pb-4">
        <div className="pt-3 text-center">
          <div className="text-[13px] font-bold tracking-[.2em] text-[var(--fg-muted)]">今 日 练 习</div>
          <div className="mt-3 text-[46px] font-extrabold leading-none xc-grad-text">{accuracy}%</div>
          <div className="mt-1 text-[12px] text-[var(--fg-muted)]">正确率 · 用时 {Math.floor(totalSec / 60)}分{totalSec % 60}秒</div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { v: questions.length, l: "题量" },
            { v: correctCount, l: "答对" },
            { v: answeredCount - correctCount, l: "答错" },
          ].map((s) => (
            <div key={s.l} className="xc-stat">
              <b className="block text-[18px] font-extrabold xc-grad-text">{s.v}</b>
              <span className="text-[10.5px] text-[var(--fg-muted)]">{s.l}</span>
            </div>
          ))}
        </div>

        <div className="xc-card mt-3">
          <div className="card-t">逐题回顾</div>
          <div className="space-y-1.5">
            {questions.map((x, i) => {
              const a = answers[String(x.id)];
              const ok = a === String(x.answer ?? "").trim();
              return (
                <button
                  key={x.id}
                  onClick={() => setDetailId(x.id)}
                  className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left text-[12px] active:bg-[var(--chip)]"
                >
                  <span className="truncate pr-3 text-[var(--fg-2)]">第 {i + 1} 题 · {x.qtype || x.module || ""} ›</span>
                  <span className={!a ? "text-[var(--fg-muted)]" : ok ? "text-[var(--ok)]" : "text-[var(--accent-text)]"}>
                    {!a ? "未作答" : ok ? "正确" : "错误"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex gap-2.5">
          <Link href="/" className="xc-btn-ghost flex-1">回首页</Link>
          <button onClick={restart} className="xc-btn flex-1">再来 10 题</button>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--fg-muted)]">
        题目加载失败，<button onClick={restart} className="ml-1 underline">重试</button>
      </div>
    );
  }

  const isMarked = marked.has(q.id);

  return (
    <div className="xc-fade pb-36">
      {/* 顶部 */}
      <div className="card p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setExitAsk(true)}
            aria-label="返回"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)]"
          >
            <Icon name="arrow-left" size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-[12px]">
            <span className="font-bold tabular-nums text-[var(--accent-text)]">{index + 1}</span>
            <span className="tabular-nums text-[var(--fg-muted)]">/ {questions.length}</span>
            <span className="ml-1 text-[10px] text-[var(--fg-muted)]">已答 {answeredCount}</span>
          </div>
          <button
            onClick={() => setMarked((prev) => {
              const n = new Set(prev);
              if (n.has(q.id)) n.delete(q.id); else n.add(q.id);
              return n;
            })}
            className={`flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold ${
              isMarked ? "border-[#F5C26B] bg-[#FFF3D6] text-[#B45309]" : "border-[var(--line)] text-[var(--fg-muted)]"
            }`}
          >
            {isMarked ? "★ 已标记" : "☆ 标记"}
          </button>
          <button
            onClick={() => setSubmitAsk(true)}
            className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-white"
            style={{ background: "var(--grad)", boxShadow: "0 6px 14px -6px rgba(233,69,96,.7)" }}
          >
            交卷
          </button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--track)]">
          <div className="h-full rounded-full" style={{ width: `${((index + 1) / questions.length) * 100}%`, background: "var(--grad)", transition: "width .4s ease" }} />
        </div>
      </div>

      {/* 题目 */}
      <div className="mt-3">
        <QuestionTimer seconds={qSec} delta={answered ? "first" : "first"} answered={!!answered} />
        <SwipeArea
          canPrev={index > 0}
          canNext={index < questions.length - 1}
          onPrev={() => { setIndex((i) => Math.max(0, i - 1)); setQSec(0); }}
          onNext={() => { setIndex((i) => Math.min(questions.length - 1, i + 1)); setQSec(0); }}
        >
          <QuestionCard
            key={q.id}
            question={q}
            showAnswer={revealed.has(q.id)}
            hideToggle
            markCorrect={revealed.has(q.id)}
            onAnswerSelect={(_, label) => choose(label)}
            selectedAnswer={answered}
          />
        </SwipeArea>
      </div>

      {answered && (
        <div className="mt-3">
          <RelatedQuestions questionId={q.id} />
        </div>
      )}

      {/* 底部操作 */}
      <FixedLayer>
        <div className="fixed inset-x-0 z-40 px-3" style={{ bottom: "calc(10px + env(safe-area-inset-bottom, 0px))", maxWidth: 480, margin: "0 auto" }}>
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/96 p-2 shadow-xl backdrop-blur">
            <button
              onClick={() => { setIndex((i) => Math.max(0, i - 1)); setQSec(0); }}
              disabled={index === 0}
              className="flex h-11 w-[74px] flex-col items-center justify-center rounded-xl border border-[var(--line)] text-[11px] font-semibold text-[var(--fg-2)] disabled:opacity-35"
            >
              <Icon name="arrow-left" size={15} />
              上一题
            </button>
            {answered && !revealed.has(q.id) && (
              <button
                onClick={() => setRevealed((prev) => new Set(prev).add(q.id))}
                className="h-11 flex-1 rounded-xl text-[13px] font-bold text-white"
                style={{ background: "linear-gradient(135deg,#F59E0B,#F4701E)" }}
              >
                查看答案
              </button>
            )}
            {answered && revealed.has(q.id) && (
              <div className="flex-1 text-center text-[11.5px] text-[var(--fg-muted)]">
                正确答案 <b className={answered === correctAnswer ? "text-[var(--ok)]" : "text-[var(--accent-text)]"}>{correctAnswer}</b>
              </div>
            )}
            <button
              onClick={() => {
                if (index < questions.length - 1) { setIndex(index + 1); setQSec(0); }
                else setSubmitAsk(true);
              }}
              className="h-11 flex-1 rounded-xl text-[13px] font-bold text-white"
              style={{ background: "var(--grad)" }}
            >
              {index < questions.length - 1 ? "下一题 →" : "交卷完成"}
            </button>
          </div>
        </div>
        <DraggableTimer seconds={totalSec} />
        <QuestionNav
          total={questions.length}
          current={index}
          answeredIds={new Set(questions.filter((x) => answers[String(x.id)]).map((x) => x.id))}
          markedIds={marked}
          questionIds={questions.map((x) => x.id)}
          onJump={(i) => { setIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      </FixedLayer>

      <ReasonSheet open={reasonFor !== null} questionId={reasonFor} onClose={() => setReasonFor(null)} />

      {detailId !== null && (
        <QuestionModal questionId={detailId} onClose={() => setDetailId(null)} />
      )}

      <ConfirmDialog
        open={exitAsk}
        title="还没做完哦"
        desc="今日事今日毕！进度已保存，下次可以接着做"
        progress={{ done: answeredCount, total: questions.length }}
        confirmText="继续做题"
        cancelText="先退出"
        onConfirm={() => setExitAsk(false)}
        onCancel={() => { setExitAsk(false); window.location.href = "/"; }}
      />
      <ConfirmDialog
        open={submitAsk}
        title="确认交卷？"
        desc={answeredCount < questions.length ? `还有 ${questions.length - answeredCount} 题未作答` : "交卷后可以查看本次正确率"}
        confirmText="交卷"
        cancelText="再检查一下"
        onConfirm={submit}
        onCancel={() => setSubmitAsk(false)}
      />
    </div>
  );
}
