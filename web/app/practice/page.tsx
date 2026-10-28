"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addPracticeRecord } from "../lib/history";
import { setImmersive } from "../lib/immersive";
import DraggableTimer from "../components/DraggableTimer";
import QuestionNav from "../components/QuestionNav";
import FixedLayer from "../components/FixedLayer";
import ConfirmDialog from "../components/ConfirmDialog";
import ReasonSheet from "../components/ReasonSheet";
import { enqueueReview } from "../lib/spaced-repetition";
import { diagnose } from "../lib/rhythm";
import ScorePoster from "../components/ScorePoster";
import SwipeArea from "../components/SwipeArea";
import QuestionTimer from "../components/QuestionTimer";
import QuestionCard, { type Question } from "../components/QuestionCard";
import RelatedQuestions from "../components/RelatedQuestions";
import RelatedPractice from "../components/RelatedPractice";
import QuestionModal from "../components/QuestionModal";
import Icon from "../components/Icon";
import { MODULES, QTYPE_BY_MODULE } from "../lib/consts";
import { addWrongCount } from "../lib/wrong-store";
import { getLastTime, setLastTime, compareTime, type TimeDelta } from "../lib/time-store";
import { formatTime } from "../lib/time-utils";
import { useSessionStorage, clearSession as clearStoredSession } from "../lib/useSessionStorage";

const COUNT_OPTIONS = [5, 10, 20, 30, 50, 100];
const SESSION_KEY = "practiceSession";
/** 每日一练使用独立会话，与题型专练互不影响 */
const DAILY_SESSION_KEY = "practiceSession:daily";
/** 未完成练习自动续做的保留时限：超过则只在选范围页提示，不自动跳进做题 */
const RESUME_MAX_AGE = 2 * 60 * 60 * 1000;

interface PracticeSnapshot {
  module?: string;
  qtype?: string;
  count?: number;
  ids: number[];
  index?: number;
  answers?: Record<number, string>;
  revealed?: Record<number, boolean>;
  times?: Record<number, number>;
  totalSec?: number;
  qSec?: number;
  savedAt?: number;
}

function formatResumeTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Phase = "select" | "practice" | "summary";

export default function PracticePage() {
  const [phase, setPhase] = useState<Phase>("select");

  const [selectedModule, setSelectedModule] = useState("");
  const [selectedQtype, setSelectedQtype] = useState("");
  const [questionCount, setQuestionCount] = useState(20);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [times, setTimes] = useState<Record<number, number>>({});
  const [prevTimes, setPrevTimes] = useState<Record<number, number | null>>({});

  // 计时：running=false 时整体暂停（例如打开相关题练习层）
  const [running, setRunning] = useState(false);
  const [totalSec, setTotalSec] = useState(0);
  const [qSec, setQSec] = useState(0);
  const [prevOfCurrent, setPrevOfCurrent] = useState<number | null>(null);

  const [relatedId, setRelatedId] = useState<number | null>(null);
  const [modalQuestion, setModalQuestion] = useState<Question | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  /** 过期的未完成练习：停在选范围页，由用户决定是否继续 */
  const [resumeInfo, setResumeInfo] = useState<PracticeSnapshot | null>(null);
  /** 本次进入是自动续做的（顶部提示可一键重新选择） */
  const [restoredNotice, setRestoredNotice] = useState(false);

  const currentQ = questions[currentIndex];
  const answered = currentQ ? !!answers[currentQ.id] : false;

  // 心跳闭包用 ref 读取最新作答状态
  // 做题阶段隐藏底部 Tab
  useEffect(() => {
    setImmersive(phase === "practice");
    return () => setImmersive(false);
  }, [phase]);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // 硬件返回键：做题中弹「还没做完哦」，其余状态交给路由守卫
  useEffect(() => {
    (window as unknown as { __xcPageBack?: () => boolean }).__xcPageBack = () => {
      // 只有做题中才拦截（弹「还没做完哦」）；报告/选择页交给路由守卫
      if (phaseRef.current === "practice") {
        setExitAsk("practice");
        return true;
      }
      return false;
    };
    return () => { delete (window as unknown as { __xcPageBack?: () => boolean }).__xcPageBack; };
  }, []);

  const answeredRef = useMemo(() => ({ current: false }), []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("markedQuestions");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setMarked(new Set(arr.filter((n) => typeof n === "number")));
      }
    } catch {}
  }, []);
  const touchX = useRef<number | null>(null);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [exitAsk, setExitAsk] = useState<false | "daily" | "practice">(false);
  const [reasonFor, setReasonFor] = useState<number | null>(null);
  const [poster, setPoster] = useState(false);
  const toggleMark = useCallback((id?: number) => {
    if (!id) return;
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("markedQuestions", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);
  const goPrev = useCallback(() => {
    setCurrentIndex((i) => { if (i <= 0) return i; setQSec(0); return i - 1; });
  }, []);
  answeredRef.current = answered;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setTotalSec((s) => s + 1);
      setQSec((s) => (answeredRef.current ? s : s + 1));
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  // 换题：重置本题计时并读取该题上次用时
  useEffect(() => {
    if (phase !== "practice" || !currentQ) return;
    setQSec(0);
    const prev = getLastTime(currentQ.id);
    setPrevOfCurrent(prev);
    setPrevTimes((p) => ({ ...p, [currentQ.id]: prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex, questions.length]);

  // 会话持久化（共享 Hook）
  const { restore } = useSessionStorage(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "daily"
      ? DAILY_SESSION_KEY
      : SESSION_KEY,
    phase === "practice" && questions.length > 0,
    () => ({
      module: selectedModule,
      qtype: selectedQtype,
      count: questionCount,
      ids: questions.map((q) => q.id),
      index: currentIndex,
      answers,
      revealed,
      times,
      totalSec,
      qSec,
    }),
    [
      phase,
      questions,
      currentIndex,
      answers,
      revealed,
      times,
      totalSec,
      qSec,
      selectedModule,
      selectedQtype,
      questionCount,
    ]
  );

  /** 应用上次未完成的练习快照 */
  const applySnapshot = useCallback(
    async (data: PracticeSnapshot, autoResumed: boolean) => {
      try {
        const res = await fetch(`/api/questions/batch?ids=${data.ids.join(",")}`);
        if (!res.ok) return false;
        const json = await res.json();
        const items: Question[] = json.items || [];
        if (items.length === 0) return false;

        const idx = Math.min(Number(data.index) || 0, items.length - 1);
        setSelectedModule(data.module || "");
        setSelectedQtype(data.qtype || "");
        setQuestionCount(Number(data.count) || items.length);
        setQuestions(items);
        setCurrentIndex(idx);
        setAnswers(data.answers || {});
        setRevealed(data.revealed || {});
        setTimes(data.times || {});
        setTotalSec(Number(data.totalSec) || 0);
        setQSec(Number(data.qSec) || 0);
        setPrevOfCurrent(getLastTime(items[idx].id));
        setResumeInfo(null);
        setRestoredNotice(autoResumed);
        setPhase("practice");
        setRunning(true);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // 挂载时尝试恢复上次未完成的练习
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const presetModule = params.get("module");
    if (presetModule) setSelectedModule(presetModule);

    // 今日一练：/practice?quick=10&mode=daily 直接随机开练（独立进度）
    const quick = Number(params.get("quick")) || 0;
    const isDaily = params.get("mode") === "daily";
    if (quick > 0) {
      const key = isDaily ? DAILY_SESSION_KEY : SESSION_KEY;
      const saved = restore() as PracticeSnapshot | null;
      const savedAt = Number(saved?.savedAt) || 0;
      const fresh = savedAt && Date.now() - savedAt <= RESUME_MAX_AGE;
      if (isDaily && saved?.ids?.length && fresh) {
        // 每日一练：恢复上次进度，不重新抽题
        applySnapshot(saved, true);
        return;
      }
      clearStoredSession(key);
      loadPractice("", "", quick);
      return;
    }

    const data = restore() as PracticeSnapshot | null;
    if (!data?.ids?.length) return;

    const savedAt = Number(data.savedAt) || 0;
    const stale = !savedAt || Date.now() - savedAt > RESUME_MAX_AGE;

    if (stale) {
      // 太久以前（或时间戳缺失）的进度：不自动跳进做题，留在选范围页询问
      setResumeInfo(data);
      return;
    }

    applySnapshot(data, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qtypeChoices = selectedModule
    ? QTYPE_BY_MODULE[selectedModule] ?? []
    : Object.values(QTYPE_BY_MODULE).flat();

  const answeredCount = Object.keys(answers).length;
  const correctCount = useMemo(
    () =>
      questions.filter(
        (q) => answers[q.id] && answers[q.id] === (q.answer ?? "").trim()
      ).length,
    [questions, answers]
  );

  /** 按指定范围随机抽题并进入做题阶段（module 为空表示全部模块） */
  const loadPractice = useCallback(async (module: string, qtype: string, count: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (module) params.set("module", module);
      if (qtype) params.set("qtype", qtype);
      params.set("random", "true");
      params.set("pageSize", String(count));

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error("题目加载失败");
      const data = await res.json();
      const items: Question[] = data.items || [];

      if (items.length === 0) {
        setError("这个范围暂时没有题目，换个模块或题型试试。");
        return false;
      }

      setSelectedModule(module);
      setSelectedQtype(qtype);
      setQuestionCount(count);
      setQuestions(items);
      setCurrentIndex(0);
      setAnswers({});
      setRevealed({});
      setTimes({});
      setPrevTimes({});
      setTotalSec(0);
      setQSec(0);
      setResumeInfo(null);
      setRestoredNotice(false);
      setRunning(true);
      setPhase("practice");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "题目加载失败");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const startPractice = useCallback(
    () => loadPractice(selectedModule, selectedQtype, questionCount),
    [loadPractice, selectedModule, selectedQtype, questionCount]
  );

  const handleAnswerSelect = (questionId: number, label: string) => {
    const spent = qSec;

    setAnswers((prev) => ({ ...prev, [questionId]: label }));
    setTimes((prev) => ({ ...prev, [questionId]: spent }));
    setPrevTimes((prev) => ({ ...prev, [questionId]: prevOfCurrent }));
    setLastTime(questionId, spent); // 记忆本次用时，下次用于对比

    const q = questions[currentIndex];
    const wrong = !!q && label !== (q.answer ?? "").trim();
    if (wrong && q) {
      addWrongCount(q.id);
      enqueueReview(q.id);
      setReasonFor(q.id); // 弹错因面板
    }
    // 作答后把操作区定位到视野内，方便快速下一题
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 80);
  };

  const toggleReveal = (questionId: number) => {
    setRevealed((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setQSec(0);
    } else {
      setRunning(false);
      clearStoredSession(SESSION_KEY);
      setPhase("summary");
    }
  };

  // 交卷二次确认（弹窗）
  const handleSubmitWithConfirm = (action: () => void) => {
    setPendingAction(() => action);
    setShowSubmitConfirm(true);
  };

  const allAnswered = Object.keys(answers).length >= questions.length;

  // 提前交卷：直接结束当前练习并进入结果分析
  const submitPracticeEarly = useCallback(() => {
    setRunning(false);
    clearStoredSession(SESSION_KEY);
    setPhase("summary");
  }, []);

  const reset = () => {
    clearStoredSession(SESSION_KEY);
    setRunning(false);
    setPhase("select");
    setQuestions([]);
    setAnswers({});
    setRevealed({});
    setTimes({});
    setPrevTimes({});
    setCurrentIndex(0);
  };

  // ───────────── 选择阶段 ─────────────
  if (phase === "select") {
    return (
      <div className="space-y-6">
        <h1 className="xc-title">题型专练</h1>

        {resumeInfo && (
          <div className="card p-4 border-[var(--accent)]">
            <p className="text-sm font-medium text-[var(--fg)] mb-1">
              发现上次未完成的练习
            </p>
            <p className="text-xs text-[var(--fg-muted)] mb-3">
              {resumeInfo.module || "全部模块"}
              {resumeInfo.qtype ? ` · ${resumeInfo.qtype}` : ""} · 已答{" "}
              {Object.keys(resumeInfo.answers || {}).length}/{resumeInfo.ids.length}
              {resumeInfo.savedAt ? ` · ${formatResumeTime(Number(resumeInfo.savedAt))}` : ""}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => applySnapshot(resumeInfo, true)}
                className="px-4 py-2 rounded-lg bg-[var(--accent-fill)] text-white text-sm font-medium hover:opacity-90 transition-smooth"
              >
                继续上次
              </button>
              <button
                onClick={() => {
                  clearStoredSession(SESSION_KEY);
                  setResumeInfo(null);
                }}
                className="px-4 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg)] hover:border-[var(--accent)] transition-smooth"
              >
                放弃并重新选择
              </button>
            </div>
          </div>
        )}

        <div className="card p-6 space-y-5">
          <h2 className="text-base font-semibold text-[var(--fg)]">
            选择练习范围
          </h2>

          {/* 模块 chips */}
          <div>
            <div className="mb-2 text-sm font-semibold text-[var(--fg-2)]">选择模块</div>
            <div className="flex flex-wrap gap-2">
              {MODULES.map((m) => (
                <button
                  key={m.value || "all"}
                  onClick={() => {
                    setSelectedModule(m.value);
                    setSelectedQtype("");
                  }}
                  className={`xc-chip ${selectedModule === m.value ? "xc-chip-on" : ""}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 题型 chips */}
          <div>
            <div className="mb-2 text-sm font-semibold text-[var(--fg-2)]">选择题型</div>
            {selectedModule ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedQtype("")}
                  className={`xc-chip ${selectedQtype === "" ? "xc-chip-on" : ""}`}
                >
                  全部题型
                </button>
                {qtypeChoices.map((q) => (
                  <button
                    key={q}
                    onClick={() => setSelectedQtype(q)}
                    className={`xc-chip ${selectedQtype === q ? "xc-chip-on" : ""}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--fg-muted)]">先选模块，再精细到题型</p>
            )}
          </div>

          {/* 题量 4 宫格 */}
          <div>
            <div className="mb-2 text-sm font-semibold text-[var(--fg-2)]">本次题量</div>
            <div className="grid grid-cols-4 gap-2.5">
              {[5, 10, 20, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={`h-[46px] rounded-[14px] text-[15px] font-bold transition-smooth ${
                    questionCount === n
                      ? "text-white"
                      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--fg-2)]"
                  }`}
                  style={questionCount === n ? { background: "var(--grad)", boxShadow: "0 8px 18px rgba(233,69,96,.26)" } : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startPractice}
            disabled={loading}
            className="xc-btn w-full disabled:opacity-40"
          >
            {loading ? "正在组题…" : `开始练习（${questionCount} 题）`}
          </button>

          <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
            「全部模块」会从全部真题里随机抽题；作答后不会自动给答案，点「查看答案」才显示；
            每题右上方悬浮显示该题用时，并与你上次做这题的用时对比（更快变绿、更慢变红）。
          </p>
        </div>

        {error && (
          <div className="card p-4 border-[var(--accent)]" role="alert">
            <p className="text-sm text-[var(--accent-text)]">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ───────────── 结果分析阶段 ─────────────
  if (phase === "summary") {
    const recorded = questions
      .map((q, i) => ({
        index: i + 1,
        id: q.id,
        qtype: q.qtype,
        spent: times[q.id] ?? 0,
        answered: !!answers[q.id],
        correct: !!answers[q.id] && answers[q.id] === (q.answer ?? "").trim(),
      }))
      .filter((r) => r.answered);

    const sumSpent = recorded.reduce((a, b) => a + b.spent, 0);
    const avgSpent = recorded.length
      ? Math.round(sumSpent / recorded.length)
      : 0;
    const fastest = recorded.length
      ? recorded.reduce((a, b) => (a.spent <= b.spent ? a : b))
      : null;
    const slowest = recorded.length
      ? recorded.reduce((a, b) => (a.spent >= b.spent ? a : b))
      : null;
    const slowOnes = [...recorded].sort((a, b) => b.spent - a.spent).slice(0, 3);
    const rhythm = diagnose(
      questions.map((q) => ({
        id: q.id,
        sec: times[q.id] ?? 0,
        correct: answers[q.id] === (q.answer ?? "").trim(),
        label: q.qtype || q.module || "",
      }))
    );
    const accuracy = answeredCount
      ? Math.round((correctCount / answeredCount) * 100)
      : 0;
    const isDailyRun = typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("mode") === "daily";
    addPracticeRecord({
      total: questions.length,
      answered: answeredCount,
      correct: correctCount,
      accuracy,
      module: isDailyRun ? "每日一练" : (selectedModule || "题型专练"),
    });
    const perQuestionAvg = questions.length
      ? Math.round(totalSec / questions.length)
      : 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--fg)] hover:border-[var(--accent)] transition-smooth"
          >
            <Icon name="arrow-left" size={16} />
            返回
          </button>
          <button
            onClick={() => setPoster(true)}
            className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-[var(--accent-text)] transition-all active:scale-95"
            style={{
              background: "linear-gradient(#fff,#fff) padding-box, var(--grad) border-box",
              border: "1.5px solid transparent",
              boxShadow: "0 6px 18px -10px rgba(233,69,96,.85)",
            }}
          >
            <span className="text-base leading-none">🖼️</span>
            生成海报
            <span className="text-xs opacity-70 transition-transform group-hover:translate-x-0.5">→</span>
          </button>
          <button
            onClick={startPractice}
            className="px-4 py-1.5 rounded-lg bg-[var(--accent-fill)] text-white text-sm font-medium hover:opacity-90 transition-smooth"
          >
            同范围再来一组
          </button>
        </div>

        <h1 className="text-xl font-bold text-[var(--fg)]">本次练习报告</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-[var(--fg-muted)] mb-1">总用时</div>
            <div className="text-2xl font-bold text-[var(--accent-text)] tabular-nums">
              {formatTime(totalSec)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-[var(--fg-muted)] mb-1">已答 / 题量</div>
            <div className="text-2xl font-bold text-[var(--fg)] tabular-nums">
              {answeredCount}/{questions.length}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-[var(--fg-muted)] mb-1">正确率</div>
            <div className="text-2xl font-bold text-[var(--ok)] tabular-nums">
              {accuracy}%
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-[var(--fg-muted)] mb-1">平均每题</div>
            <div className="text-2xl font-bold text-[var(--fg)] tabular-nums">
              {perQuestionAvg}s
            </div>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-base font-semibold text-[var(--fg)] mb-3">
            用时分析
          </h2>
          <ul className="text-sm text-[var(--fg)] space-y-1.5">
            <li>
              已答题合计用时{" "}
              <span className="text-[var(--accent-text)] tabular-nums">
                {formatTime(sumSpent)}
              </span>
              ，平均每题{" "}
              <span className="text-[var(--accent-text)] tabular-nums">{avgSpent}s</span>
            </li>
            {fastest && (
              <li>
                最快：第 {fastest.index} 题，用时{" "}
                <span className="tabular-nums">{fastest.spent}s</span>
                {fastest.correct ? "（答对）" : "（答错）"}
              </li>
            )}
            {slowest && (
              <li>
                最慢：第 {slowest.index} 题，用时{" "}
                <span className="tabular-nums">{slowest.spent}s</span>
                {slowest.correct ? "（答对）" : "（答错）"}
              </li>
            )}
            <li className="text-[var(--fg-muted)]">
              建议：行测单选题平均 45–60s 属正常区间；超过{" "}
              <span className="tabular-nums">
                {Math.max(90, avgSpent * 2)}s
              </span>{" "}
              的题目多半是考点没抓住，优先复盘。
            </li>
          </ul>
          {slowOnes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {slowOnes.map((r) => (
                <span
                  key={r.id}
                  className="px-2 py-1 rounded-md bg-[var(--chip)] text-xs text-[var(--chip-fg)] tabular-nums"
                >
                  第 {r.index} 题 · {r.spent}s · {r.correct ? "对" : "错"}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4">
          <h2 className="text-base font-semibold text-[var(--fg)] mb-2">节奏诊断</h2>
          <p className="text-[11.5px] text-[var(--fg-muted)]">
            平均每题 {rhythm.avg}s · 总用时 {Math.floor(rhythm.totalSec / 60)}分{rhythm.totalSec % 60}秒
          </p>
          <div className="xc-hist mt-2" style={{ height: 64 }}>
            {rhythm.buckets.map((b, i) => {
              const max = Math.max(...rhythm.buckets.map((x) => x.count), 1);
              return <i key={i} className="xc-grow" style={{ height: `${Math.max(6, (b.count / max) * 100)}%` }} />;
            })}
          </div>
          <div className="mt-1 flex justify-between text-[9.5px] text-[var(--fg-muted)]">
            {rhythm.buckets.map((b) => <span key={b.label}>{b.label}</span>)}
          </div>
          <p className="mt-2 rounded-lg bg-[var(--chip)] p-2 text-[11.5px] leading-relaxed text-[var(--fg-2)]">
            {rhythm.conclusion}
          </p>
        </div>

        <div className="card p-4">
          <h2 className="text-base font-semibold text-[var(--fg)] mb-3">
            逐题明细
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-[var(--fg-muted)]">
                <tr className="text-left border-b border-[var(--line)]">
                  <th className="py-2 pr-3">题号</th>
                  <th className="py-2 pr-3">题型</th>
                  <th className="py-2 pr-3">你的答案</th>
                  <th className="py-2 pr-3">正确答案</th>
                  <th className="py-2 pr-3">用时</th>
                  <th className="py-2 pr-3">结果</th>
                  <th className="py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, i) => {
                  const ans = answers[q.id];
                  const isAnswered = !!ans;
                  const correct = ans === (q.answer ?? "").trim();
                  return (
                    <tr key={q.id} className="border-b border-[var(--line)]">
                      <td className="py-2 pr-3">
                        <button
                          onClick={() => setModalQuestion(q)}
                          className="underline decoration-[var(--line)] underline-offset-2 hover:text-[var(--accent-text)]"
                          aria-label={`查看第 ${i + 1} 题`}
                        >
                          {i + 1}
                        </button>
                      </td>
                      <td className="py-2 pr-3 text-[var(--fg-muted)]">{q.qtype}</td>
                      <td className="py-2 pr-3">{ans ?? "—"}</td>
                      <td className="py-2 pr-3">
                        {(q.answer ?? "").trim() || "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {isAnswered ? `${times[q.id] ?? 0}s` : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {isAnswered ? (
                          correct ? (
                            <span className="text-[var(--ok)]">正确</span>
                          ) : (
                            <span className="text-[var(--accent-text)]">错误</span>
                          )
                        ) : (
                          <span className="text-[var(--fg-muted)]">未作答</span>
                        )}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => setModalQuestion(q)}
                          className="px-2 py-1 rounded-md border border-[var(--line)] text-xs text-[var(--fg)] hover:border-[var(--accent)] transition-smooth whitespace-nowrap"
                        >
                          查看题目
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {modalQuestion && (
          <QuestionModal
            question={modalQuestion}
            onClose={() => setModalQuestion(null)}
          />
        )}

        {poster && (
          <ScorePoster
            data={{
              title: isDailyRun ? "每日一练" : selectedModule || "题型专练",
              accuracy,
              total: questions.length,
              correct: correctCount,
              seconds: totalSec,
            }}
            onClose={() => setPoster(false)}
          />
        )}
      </div>
    );
  }

  // ───────────── 做题阶段 ─────────────
  if (!currentQ) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[var(--fg-muted)]">没有题目</p>
        <button onClick={reset} className="mt-3 text-[var(--accent-text)] underline">
          返回重新选择
        </button>
      </div>
    );
  }

  const isRevealed = !!revealed[currentQ.id];
  const myAnswer = answers[currentQ.id];
  const correctAnswer = (currentQ.answer ?? "").trim();
  const progressPct = ((currentIndex + 1) / questions.length) * 100;

  // 本题用时与历史对比
  const finalQSec = answered ? times[currentQ.id] ?? 0 : qSec;
  const delta: TimeDelta = answered
    ? compareTime(finalQSec, prevOfCurrent)
    : "first";
  const timerColor =
    delta === "faster"
      ? "text-[var(--ok)] border-[var(--ok)]"
      : delta === "slower"
      ? "text-[var(--accent-text)] border-[var(--accent)]"
      : "text-[var(--fg)] border-[var(--line)]";

  return (
    <div className="space-y-4 pb-24">
      {restoredNotice && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--chip)] px-3 py-2 text-xs text-[var(--chip-fg)]">
          <span>已恢复上次未完成的练习</span>
          <button onClick={reset} className="underline decoration-[var(--line)]">
            重新选择范围
          </button>
        </div>
      )}
      {/* 顶部条：返回 / 题号 / 标记 / 交卷 */}
      <div className="card p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setExitAsk("practice")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)]"
            aria-label="返回"
          >
            <Icon name="arrow-left" size={16} />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-[12px]">
            <span className="font-bold text-[var(--accent-text)] tabular-nums">{currentIndex + 1}</span>
            <span className="text-[var(--fg-muted)] tabular-nums">/ {questions.length}</span>
            {marked.has(currentQ?.id ?? -1) && <span className="text-[10px] text-[#B45309]">已标记</span>}
          </div>
          <button
            onClick={() => toggleMark(currentQ?.id)}
            className={`flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold ${
              marked.has(currentQ?.id ?? -1)
                ? "border-[#F5C26B] bg-[#FFF3D6] text-[#B45309]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--fg-muted)]"
            }`}
          >
            {marked.has(currentQ?.id ?? -1) ? "★ 已标记" : "☆ 标记"}
          </button>
          <button
            onClick={() => handleSubmitWithConfirm(submitPracticeEarly)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white"
            style={{ background: "var(--grad)", boxShadow: "0 6px 14px -6px rgba(233,69,96,.7)" }}
          >
            交卷
          </button>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--track)] overflow-hidden">
          <div
            className="h-full bg-[var(--accent-fill)] transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 题目区（支持左右滑动切题） */}
      <div className="relative mt-3">
        <QuestionTimer
          seconds={finalQSec}
          delta={delta}
          prevSeconds={prevOfCurrent ?? undefined}
          answered={answered}
        />
        <SwipeArea
          canPrev={currentIndex > 0}
          canNext={currentIndex < questions.length - 1}
          onPrev={goPrev}
          onNext={goNext}
        >
          <QuestionCard
            key={currentQ.id}
            question={currentQ}
            showAnswer={isRevealed}
            hideToggle
            markCorrect={isRevealed}
            onAnswerSelect={handleAnswerSelect}
            selectedAnswer={myAnswer}
            isCorrect={answered && isRevealed ? myAnswer === correctAnswer : null}
          />
        </SwipeArea>
      </div>

      {/* 固定操作条：上一题 / 下一题 / 标记（始终可见） */}
      <FixedLayer>
      <div
        className="fixed inset-x-0 z-40 px-3"
        style={{ bottom: "calc(10px + env(safe-area-inset-bottom, 0px))", maxWidth: 480, margin: "0 auto" }}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/96 p-2 shadow-xl backdrop-blur">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="flex h-11 w-[74px] flex-col items-center justify-center rounded-xl border border-[var(--line)] text-[11px] font-semibold text-[var(--fg-2)] disabled:opacity-35"
          >
            <Icon name="arrow-left" size={15} />
            上一题
          </button>

          {!answered ? (
            <div className="flex-1 text-center text-[11.5px] text-[var(--fg-muted)]">选择一个选项作答</div>
          ) : (
            <button
              data-testid="main-reveal"
              onClick={() => toggleReveal(currentQ.id)}
              className="h-11 flex-1 rounded-xl bg-[var(--accent-fill)] text-[13px] font-bold text-white"
            >
              {isRevealed ? "收起答案" : "查看答案"}
            </button>
          )}

          <button
            onClick={currentIndex < questions.length - 1 ? goNext : () => handleSubmitWithConfirm(goNext)}
            className="h-11 flex-1 rounded-xl text-[13px] font-bold text-white"
            style={{ background: "var(--grad)" }}
          >
            {currentIndex < questions.length - 1 ? "下一题 →" : "交卷看分析"}
          </button>
        </div>
        {isRevealed && (
          <div className="mt-1.5 rounded-xl bg-[var(--surface)]/95 px-3 py-2 text-[11.5px] text-[var(--fg-muted)] shadow-md">
            本题用时 {times[currentQ.id] ?? 0}s · 你的答案 {myAnswer} · 正确答案{" "}
            <b className={myAnswer === correctAnswer ? "text-[var(--ok)]" : "text-[var(--accent-text)]"}>
              {correctAnswer || "—"}
            </b>
          </div>
        )}
      </div>

      </FixedLayer>

      {/* 答完题后：相关知识点 + 同类题（点开即暂停计时） */}
      {answered && (
        <RelatedQuestions
          questionId={currentQ.id}
          onOpen={(id) => {
            setRunning(false);
            setRelatedId(id);
          }}
        />
      )}

      {/* 可拖动总用时计时器 + 题号悬浮窗 */}
      <FixedLayer><DraggableTimer seconds={totalSec} /></FixedLayer>
      <FixedLayer><QuestionNav
        total={questions.length}
        current={currentIndex}
        answeredIds={new Set(questions.filter((q) => answers[q.id]).map((q) => q.id))}
        markedIds={marked}
        questionIds={questions.map((q) => q.id)}
        onJump={(i) => { setCurrentIndex(i); setQSec(0); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      /></FixedLayer>

      {relatedId !== null && (
        <RelatedPractice
          questionId={relatedId}
          onClose={() => {
            setRelatedId(null);
            setRunning(true);
          }}
        />
      )}

      <ReasonSheet
        open={reasonFor !== null}
        questionId={reasonFor}
        onClose={() => setReasonFor(null)}
      />

      <ConfirmDialog
        open={exitAsk !== false}
        title="还没做完哦"
        desc="这次专练的进度已保存，下次回来可以接着做"
        progress={{ done: answeredCount, total: questions.length }}
        confirmText="继续练习"
        cancelText="先退出"
        onConfirm={() => setExitAsk(false)}
        onCancel={() => {
          setRunning(false);
          try {
            const isDaily = typeof window !== "undefined" &&
              new URLSearchParams(window.location.search).get("mode") === "daily";
            const snap = {
              module: selectedModule, qtype: selectedQtype, count: questionCount,
              ids: questions.map((q) => q.id), index: currentIndex,
              answers, revealed, times, totalSec, qSec, savedAt: Date.now(),
            };
            localStorage.setItem(isDaily ? DAILY_SESSION_KEY : SESSION_KEY, JSON.stringify(snap));
          } catch { /* 忽略 */ }
          setExitAsk(false);
          setPhase("select");
        }}
      />

      {/* 交卷确认弹窗（Portal 到 body，保证居中不被动画容器影响） */}
      {showSubmitConfirm && (
        <FixedLayer>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6" onClick={() => { setShowSubmitConfirm(false); setPendingAction(null); }}>
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--line)] p-6 max-w-sm mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <p className="text-base text-[var(--fg)] mb-4">
              {!allAnswered
                ? "还有未作答题目，确认交卷？"
                : "确认交卷？"}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowSubmitConfirm(false); setPendingAction(null); }}
                className="px-4 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg)] hover:border-[var(--accent)] transition-smooth"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowSubmitConfirm(false);
                  if (pendingAction) {
                    pendingAction();
                    setPendingAction(null);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:opacity-80 transition-smooth"
              >
                确认交卷
              </button>
            </div>
          </div>
        </div>
      </FixedLayer>
      )}
    </div>
  );
}
