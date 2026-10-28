"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import InlinePicker from "../components/InlinePicker";
import { onSoftRefresh } from "../lib/soft-refresh";
import { addPracticeRecord } from "../lib/history";
import { setImmersive } from "../lib/immersive";
import SwipeArea from "../components/SwipeArea";
import QuestionNav from "../components/QuestionNav";
import QuestionTimer from "../components/QuestionTimer";
import ConfirmDialog from "../components/ConfirmDialog";
import ScorePoster from "../components/ScorePoster";
import FixedLayer from "../components/FixedLayer";
import { useSearchParams } from "next/navigation";
import QuestionCard, { type Question, normalizeOptions } from "../components/QuestionCard";
import Icon from "../components/Icon";
import { getLastTime, setLastTime, compareTime, type TimeDelta } from "../lib/time-store";
import { formatTime } from "../lib/time-utils";
import { useSessionStorage, clearSession } from "../lib/useSessionStorage";
import { addWrongCounts } from "../lib/wrong-store";
import {
  loadPaperProgress,
  savePaperProgress,
  markPaperSubmitted,
  listAttemptedPapers,
  type PaperProgressMap,
} from "../lib/exam-progress";

interface ModuleCount {
  module: string;
  count: number;
}

interface Paper {
  paper_name: string;
  year: string;
  region: string;
  paper_qcount: string | null;
  totalQuestions?: number;
  moduleCounts?: ModuleCount[];
}

interface ExamResult {
  totalQuestions: number;
  answered: number;
  correct: number;
  wrong: number;
  unanswered: number;
  accuracy: number;
  moduleStats: { module: string; total: number; correct: number; accuracy: number }[];
  timeUsed: number;
}

function formatProgressDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function transformImagePath(html: string): string {
  return (html || "").replace(/\.\.\/90-图片\//g, "/images/");
}

/** 由题目 + 作答计算成绩报告（交卷与回看记录共用） */
function computeResult(
  qs: Question[],
  ans: Record<number, string>,
  timeUsed: number
): ExamResult {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  const moduleMap: Record<string, { total: number; correct: number }> = {};

  qs.forEach((q) => {
    const userAnswer = ans[q.id];
    if (!userAnswer) {
      unanswered++;
    } else if (q.answer && userAnswer === q.answer.trim()) {
      correct++;
    } else {
      wrong++;
    }

    if (!moduleMap[q.module]) {
      moduleMap[q.module] = { total: 0, correct: 0 };
    }
    moduleMap[q.module].total++;
    if (userAnswer && q.answer && userAnswer === q.answer.trim()) {
      moduleMap[q.module].correct++;
    }
  });

  const moduleStats = Object.entries(moduleMap).map(([module, stats]) => ({
    module,
    total: stats.total,
    correct: stats.correct,
    accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
  }));

  return {
    totalQuestions: qs.length,
    answered: correct + wrong,
    correct,
    wrong,
    unanswered,
    accuracy: qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0,
    moduleStats,
    timeUsed,
  };
}

export default function ExamPage() {
  return (
    <Suspense fallback={<div className="text-[var(--fg-muted)]">加载中...</div>}>
      <ExamPageContent />
    </Suspense>
  );
}

const EXAM_SESSION_KEY = "examSession";
/** 未完成考试自动续做的保留时限：超过则只在选卷页提示 */
const RESUME_MAX_AGE = 2 * 60 * 60 * 1000;

interface ExamSnapshot {
  paper?: Paper | null;
  ids: number[];
  index?: number;
  answers?: Record<number, string>;
  qTimes?: Record<number, number>;
  timeLeft?: number;
  qSec?: number;
  savedAt?: number;
}

function ExamPageContent() {
  const searchParams = useSearchParams();
  const initialYear = searchParams.get("year") || "";

  const [phase, setPhase] = useState<"select" | "exam" | "result">("select");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 120 minutes in seconds
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [qTimes, setQTimes] = useState<Record<number, number>>({});
  const [qSec, setQSec] = useState(0);
  const [prevOfCurrent, setPrevOfCurrent] = useState<number | null>(null);
  const stateRef = useRef({ answered: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState(initialYear);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [totalPapers, setTotalPapers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [detailQuestion, setDetailQuestion] = useState<number | null>(null);
  const [paperProgress, setPaperProgress] = useState<PaperProgressMap>({});
  /** 是否处于「回看历史答题记录」模式 */
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  /** 过期的未完成考试：停在选卷页，由用户决定 */
  const [examResumeInfo, setExamResumeInfo] = useState<ExamSnapshot | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch papers list with year options
  const fetchPapers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterYear) params.set("year", filterYear);
      if (filterRegion) params.set("region", filterRegion);
      if (filterQ.trim()) params.set("q", filterQ.trim());
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/papers?${params.toString()}`);
      if (!res.ok) throw new Error("试卷列表加载失败");
      const data = await res.json();
      setPapers(Array.isArray(data) ? data : data.items || []);
      setYears(data.years || []);
      setRegions(data.regions || []);
      setTotalPapers(data.pagination?.total ?? data.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "试卷列表加载失败");
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterRegion, filterQ, page]);


  useEffect(() => onSoftRefresh(fetchPapers), [fetchPapers]);
  // 硬件返回键：弹本页的退出确认，而不是直接跳出
  useEffect(() => {
    (window as unknown as { __xcPageBack?: () => boolean }).__xcPageBack = () => {
      setExitAsk(true);
      return true;
    };
    return () => { delete (window as unknown as { __xcPageBack?: () => boolean }).__xcPageBack; };
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // 答题记忆：进入选卷页时刷新已刷进度
  useEffect(() => {
    if (phase === "select") setPaperProgress(loadPaperProgress());
  }, [phase]);

  // 剩余 1 小时 / 15 分钟 / 5 分钟：抖动 + 震动提醒
  useEffect(() => {
    if (phase !== "exam") { prevTimeLeft.current = 0; return; }
    const prev = prevTimeLeft.current;
    prevTimeLeft.current = timeLeft;
    if (!prev) return; // 刚进入不触发

    const crossed = (mark: number) => prev > mark && timeLeft <= mark;
    let hit: "1h" | "15m" | "5m" | null = null;
    if (crossed(3600)) hit = "1h";
    else if (crossed(900)) hit = "15m";
    else if (crossed(300)) hit = "5m";
    if (!hit) return;

    setTimeAlert(hit);
    if (alertTimer.current) clearTimeout(alertTimer.current);
    alertTimer.current = setTimeout(() => setTimeAlert(null), 6000);
  }, [timeLeft, phase]);

  // 考试进行中隐藏底部 Tab
  useEffect(() => {
    setImmersive(phase === "exam");
    return () => setImmersive(false);
  }, [phase]);

  // 筛选条件变化时回到第一页
  useEffect(() => {
    setPage(1);
  }, [filterYear, filterRegion, filterQ]);

  // 心跳：倒计时 + 当前题用时
  useEffect(() => {
    if (phase !== "exam") return;
    const t = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      setQSec((prev) => (stateRef.current.answered ? prev : prev + 1));
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // 时间到自动交卷
  useEffect(() => {
    if (phase === "exam" && timeLeft === 0) submitExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  // 换题：重置单题计时并读取该题历史用时
  useEffect(() => {
    if (phase !== "exam" || !questions[currentIndex]) return;
    setQSec(0);
    setPrevOfCurrent(getLastTime(questions[currentIndex].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex, questions.length]);

  // 答题记忆：考试过程中实时记录本套试卷进度
  useEffect(() => {
    if (phase !== "exam" || !selectedPaper || questions.length === 0) return;
    savePaperProgress(
      selectedPaper.paper_name,
      Object.keys(answers).length,
      questions.length,
      false,
      answers
    );
  }, [phase, selectedPaper, questions.length, answers]);

  // 会话持久化（共享 Hook）
  const { restore } = useSessionStorage(
    EXAM_SESSION_KEY,
    phase === "exam" && questions.length > 0,
    () => ({
      paper: selectedPaper,
      ids: questions.map((q) => q.id),
      index: currentIndex,
      answers,
      qTimes,
      timeLeft,
      qSec,
    }),
    [phase, questions, currentIndex, answers, qTimes, timeLeft, qSec]
  );

  /** 应用未完成考试的快照 */
  const applyExamSnapshot = useCallback(async (data: ExamSnapshot) => {
    try {
      const res = await fetch(`/api/questions/batch?ids=${data.ids.join(",")}`);
      if (!res.ok) return false;
      const json = await res.json();
      const items: Question[] = json.items || [];
      if (items.length === 0) return false;
      const idx = Math.min(Number(data.index) || 0, items.length - 1);
      setSelectedPaper(data.paper || null);
      setQuestions(items);
      setCurrentIndex(idx);
      setAnswers(data.answers || {});
      setQTimes(data.qTimes || {});
      setTimeLeft(Number(data.timeLeft) || 120 * 60);
      setQSec(Number(data.qSec) || 0);
      setPrevOfCurrent(getLastTime(items[idx].id));
      setExamResumeInfo(null);
      setReviewMode(false);
      setPhase("exam");
      return true;
    } catch {
      return false;
    }
  }, []);

  // 恢复未完成的考试
  useEffect(() => {
    const data = restore() as ExamSnapshot | null;
    if (!data?.ids?.length) return;

    const savedAt = Number(data.savedAt) || 0;
    const stale = !savedAt || Date.now() - savedAt > RESUME_MAX_AGE;

    if (stale) {
      setExamResumeInfo(data);
      return;
    }

    applyExamSnapshot(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startExam = useCallback(async (paper: Paper) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("paper_name", paper.paper_name);
      params.set("pageSize", "200");

      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error("题目加载失败");
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        setSelectedPaper(paper);
        setQuestions(data.items);
        setCurrentIndex(0);
        setAnswers({});
        setQTimes({});
        setQSec(0);
        const dbg = typeof window !== "undefined"
          ? Number(new URLSearchParams(window.location.search).get("t")) || 0
          : 0;
        setTimeLeft(dbg > 0 ? dbg : 120 * 60);
        setReviewMode(false);
        setExamResult(null);
        setPhase("exam");
      } else {
        setError("该试卷没有题目数据");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "题目加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    const spent = qSec;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    setQTimes((prev) => ({ ...prev, [questionId]: spent }));
    setLastTime(questionId, spent); // 记住本题用时，供下次对比
  };

  // 供心跳判断「当前题是否已作答」
  stateRef.current.answered = !!(
    questions[currentIndex] && answers[questions[currentIndex].id]
  );

  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [exitAsk, setExitAsk] = useState(false);
  const [poster, setPoster] = useState(false);
  const [timeAlert, setTimeAlert] = useState<null | "1h" | "15m" | "5m">(null);
  const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTimeLeft = useRef<number>(0);
  const toggleMark = useCallback((id?: number) => {
    if (!id) return;
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem("examMarked", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  // 交卷二次确认（弹窗）
  const handleSubmitClick = () => {
    setShowSubmitConfirm(true);
  };

  const submitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      clearSession(EXAM_SESSION_KEY);
    } catch {
      /* ignore */
    }

    // 交卷后把答错的题计入错题本（与专练一致；未作答不计）
    const wrongIds = questions
      .filter((q) => {
        const a = answers[q.id];
        return !!a && a !== (q.answer ?? "").trim();
      })
      .map((q) => q.id);
    if (wrongIds.length > 0) addWrongCounts(wrongIds);

    setExamResult(computeResult(questions, answers, 120 * 60 - timeLeft));
    if (selectedPaper) {
      markPaperSubmitted(
        selectedPaper.paper_name,
        Object.keys(answers).length,
        questions.length,
        answers
      );
      setPaperProgress(loadPaperProgress());
    }
    // 计入练习历史（学习分析使用）
    try {
      const totalQ = questions.length;
      const answeredN = Object.keys(answers).length;
      const correctN = questions.filter((q) => answers[q.id] === (q.answer ?? "").trim()).length;
      addPracticeRecord({
        total: totalQ,
        answered: answeredN,
        correct: correctN,
        accuracy: answeredN ? Math.round((correctN / answeredN) * 100) : 0,
        module: "模拟考试",
      });
    } catch { /* 忽略 */ }

    setPhase("result");
  };

  /** 回看某套试卷的历史答题记录 */
  const openReview = useCallback(async (paperName: string) => {
    const rec = loadPaperProgress()[paperName];
    if (!rec) return;
    setReviewLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("paper_name", paperName);
      params.set("pageSize", "200");
      const res = await fetch(`/api/questions?${params.toString()}`);
      if (!res.ok) throw new Error("记录加载失败");
      const data = await res.json();
      const items: Question[] = data.items || [];
      if (items.length === 0) throw new Error("这套试卷的题目已不存在");

      const savedAnswers = (rec.answers ?? {}) as Record<string, string>;
      const restored: Record<number, string> = {};
      items.forEach((q) => {
        const v = savedAnswers[String(q.id)];
        if (v) restored[q.id] = v;
      });

      setSelectedPaper({ paper_name: paperName, year: "", region: "" } as Paper);
      setQuestions(items);
      setAnswers(restored);
      setExamResult(computeResult(items, restored, 0));
      setReviewMode(true);
      setPhase("result");
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "记录加载失败");
    } finally {
      setReviewLoading(false);
    }
  }, []);

  // Selection phase
  if (phase === "select") {
    const attempted = listAttemptedPapers();

    return (
      <div className="space-y-6">
        <h1 className="xc-title">模拟考试</h1>

        {examResumeInfo && (
          <div className="card p-4 border-[var(--accent)]">
            <p className="text-sm font-medium text-[var(--fg)] mb-1">
              发现上次未完成的考试
            </p>
            <p className="text-xs text-[var(--fg-muted)] mb-3">
              {examResumeInfo.paper?.paper_name || "未命名试卷"} · 已答{" "}
              {Object.keys(examResumeInfo.answers || {}).length}/{examResumeInfo.ids.length}
              {examResumeInfo.savedAt
                ? ` · ${formatProgressDate(Number(examResumeInfo.savedAt))}`
                : ""}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => applyExamSnapshot(examResumeInfo)}
                className="px-4 py-2 rounded-lg bg-[var(--accent-fill)] text-white text-sm font-medium hover:opacity-90 transition-smooth"
              >
                继续考试
              </button>
              <button
                onClick={() => {
                  clearSession(EXAM_SESSION_KEY);
                  setExamResumeInfo(null);
                }}
                className="px-4 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg)] hover:border-[var(--accent)] transition-smooth"
              >
                放弃并重新选择
              </button>
            </div>
          </div>
        )}

        {/* 答题记忆 */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-semibold text-[var(--fg)]">答题记忆</h2>
            <span className="text-xs text-[var(--fg-muted)]">
              {reviewLoading ? "记录加载中…" : `已刷 ${attempted.length} 套试卷`}
            </span>
          </div>

          {attempted.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)]">
              还没有做过试卷。开始一套模拟考试后，这里会自动记录你的进度。
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {attempted.slice(0, 20).map((a) => {
                const pct = a.total > 0 ? Math.round((a.answered / a.total) * 100) : 0;
                return (
                  <div
                    key={a.paperName}
                    onClick={() => {
                      if (!reviewLoading) openReview(a.paperName);
                    }}
                    title="点击查看当时的答题情况"
                    className="rounded-lg border border-[var(--line)] p-2.5 bg-[var(--surface)] cursor-pointer hover:border-[var(--accent)] transition-smooth"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm text-[var(--fg)] truncate">
                        {a.paperName}
                      </span>
                      <span className="text-xs text-[var(--fg-muted)] shrink-0 tabular-nums">
                        已做 {a.answered}/{a.total}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--track)] overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-[var(--accent-fill)] transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--fg-muted)]">
                      <span className="shrink-0">
                        {a.submitted ? "已交卷" : "进行中"} · {formatProgressDate(a.updatedAt)}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openReview(a.paperName);
                          }}
                          className="flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[11.5px] font-bold"
                          style={{
                            borderColor: "rgba(244,112,30,.28)",
                            background: "rgba(255,255,255,.9)",
                            color: "var(--accent-text)",
                          }}
                        >
                          <Icon name="clipboard" size={13} />
                          查看记录
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startExam({ paper_name: a.paperName, year: "", region: "" } as Paper);
                          }}
                          className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-bold text-white"
                          style={{ background: "var(--grad)", boxShadow: "0 6px 14px -6px rgba(233,69,96,.65)" }}
                        >
                          <Icon name="pencil" size={13} />
                          {a.submitted ? "再做一次" : "再练一次"}
                        </button>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <InlinePicker
              value={filterYear}
              ariaLabel="选择年份"
              placeholder="全部年份"
              options={[{ value: "", label: "全部年份" }, ...years.map((y) => ({ value: y, label: `${y}年` }))]}
              onChange={setFilterYear}
              columns={3}
            />
            <InlinePicker
              value={filterRegion}
              ariaLabel="选择地区"
              placeholder="全部地区"
              options={[{ value: "", label: "全部地区" }, ...regions.map((r) => ({ value: r, label: r }))]}
              onChange={setFilterRegion}
              columns={3}
            />
            <input
              type="text"
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              placeholder="搜索试卷名称"
              aria-label="搜索试卷名称"
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={() => setPage(1)}
              className="px-4 py-2 rounded-lg bg-[var(--accent-fill)] text-white text-sm font-medium hover:opacity-80"
            >
              查询试卷
            </button>
          </div>
          <p className="text-xs text-[var(--fg-muted)] mt-2">
            共 {totalPapers} 套试卷 · 第 {page}/{totalPages} 页
          </p>
        </div>

        {/* Papers list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-6 bg-[var(--chip)] rounded w-1/3 mb-2" />
                <div className="h-4 bg-[var(--chip)] rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[var(--fg-muted)]">没有匹配的试卷</p>
            <p className="text-sm text-[var(--fg-muted)] mt-2">试试换年份、地区或关键词</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {papers.map((paper) => (
              <div key={paper.paper_name} className="card p-4 relative">
                {paperProgress[paper.paper_name] && (
                  <span className="absolute -top-2 -left-2 z-10 rounded-md bg-[var(--accent-fill)] px-2 py-1 text-[11px] font-semibold text-white shadow-md tabular-nums">
                    已做 {paperProgress[paper.paper_name].answered}/
                    {paperProgress[paper.paper_name].total}
                  </span>
                )}
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h2 className="font-semibold text-[var(--fg)] text-sm leading-snug">
                    {paper.paper_name}
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-[var(--chip)] text-[var(--chip-fg)] text-xs shrink-0">
                    {paper.region}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--fg-muted)] mb-3 flex-wrap">
                  <span>{paper.year}年</span>
                  <span>{paper.totalQuestions ?? 0}题</span>
                  {paper.moduleCounts && paper.moduleCounts.length > 0 && (
                    <span className="text-xs text-[var(--fg-muted)]">
                      {paper.moduleCounts
                        .slice(0, 3)
                        .map((m) => `${m.module}${m.count}`)
                        .join(" · ")}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => startExam(paper)}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--accent-fill)] text-white text-sm font-medium hover:opacity-80 transition-smooth"
                >
                  开始考试
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--fg)] disabled:opacity-30 hover:border-[var(--accent)]"
            >
              上一页
            </button>
            <span className="text-sm text-[var(--fg-muted)]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--fg)] disabled:opacity-30 hover:border-[var(--accent)]"
            >
              下一页
            </button>
          </div>
        )}

        {error && (
          <div className="card p-4 border-[var(--accent)]">
            <p className="text-sm text-[var(--accent-text)]">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Exam phase
  if (phase === "exam") {
    const currentQ = questions[currentIndex];
    const answeredCount = Object.keys(answers).length;
    const examAnsweredNow = !!(currentQ && answers[currentQ.id]);
    const examDelta: TimeDelta = examAnsweredNow
      ? compareTime(qTimes[currentQ.id] ?? 0, prevOfCurrent)
      : "first";
    const examTimerColor =
      examDelta === "faster"
        ? "text-[var(--ok)] border-[var(--ok)]"
        : examDelta === "slower"
        ? "text-[var(--accent-text)] border-[var(--accent)]"
        : "text-[var(--fg)] border-[var(--line)]";

    return (
      <div className="space-y-4 pb-32">
        {/* 顶部：考试信息（美化版） */}
        <div className="card p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setExitAsk(true)}
              aria-label="返回"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)]"
            >
              <Icon name="arrow-left" size={16} />
            </button>

            {/* 倒计时：渐变胶囊 + 进度条 */}
            <div
              className={`flex flex-1 items-center gap-2 rounded-full px-3 py-1.5 ${timeAlert ? "xc-shake" : ""}`}
              style={{
                background: timeAlert ? "linear-gradient(135deg,#F59E0B,#DC2626)" : "var(--grad)",
                boxShadow: timeAlert
                  ? "0 0 0 3px rgba(220,38,38,.25), 0 10px 22px -10px rgba(220,38,38,.8)"
                  : "0 8px 18px -10px rgba(233,69,96,.75)",
                transition: "background .3s ease, box-shadow .3s ease",
              }}
            >
              <Icon name="timer" size={14} />
              <span className="text-[15px] font-extrabold tabular-nums text-white">{formatTime(timeLeft)}</span>
              <span className="ml-auto text-[10.5px] font-semibold text-white/90">
                {timeAlert === "1h" && "剩 1 小时！"}
                {timeAlert === "15m" && "剩 15 分钟！"}
                {timeAlert === "5m" && "剩 5 分钟！"}
                {!timeAlert && (timeLeft < 300 ? "最后冲刺" : timeLeft < 900 ? "注意节奏" : "剩余时间")}
              </span>
            </div>

            <button
              onClick={handleSubmitClick}
              className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#F4701E,#E94560)", boxShadow: "0 6px 14px -6px rgba(233,69,96,.7)" }}
            >
              交卷
            </button>
          </div>

          {/* 统计行：已答 / 未答 / 标记 */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { v: answeredCount, l: "已答", color: "var(--ok)" },
              { v: Math.max(0, questions.length - answeredCount), l: "未答", color: "var(--accent-text)" },
              { v: marked.size, l: "标记", color: "#B45309" },
            ].map((x) => (
              <div key={x.l} className="rounded-xl bg-[var(--chip)] px-2 py-1.5 text-center">
                <b className="block text-[15px] font-extrabold tabular-nums" style={{ color: x.color }}>{x.v}</b>
                <span className="text-[10px] text-[var(--fg-muted)]">{x.l} / {questions.length}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--track)]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(answeredCount / Math.max(1, questions.length)) * 100}%`, background: "var(--grad)", transition: "width .4s ease" }}
            />
          </div>
        </div>

        {/* Current question + 本题用时悬浮 */}
        {currentQ && (
          <div className="relative mt-4 pb-[132px]">
            <QuestionTimer
              seconds={examAnsweredNow ? qTimes[currentQ.id] ?? 0 : qSec}
              delta={examDelta}
              prevSeconds={prevOfCurrent ?? undefined}
              answered={examAnsweredNow}
            />

            <SwipeArea
              canPrev={currentIndex > 0}
              canNext={currentIndex < questions.length - 1}
              onPrev={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              onNext={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              <QuestionCard
                key={currentQ.id}
                question={currentQ}
                showAnswer={false}
                hideToggle
                markCorrect={false}
                onAnswerSelect={handleAnswerSelect}
                selectedAnswer={answers[currentQ.id] || undefined}
              />
            </SwipeArea>
          </div>
        )}

        {/* Navigation buttons：固定在页底，手机上始终可点 */}
        <FixedLayer>
          <div className="fixed inset-x-0 z-40 px-3" style={{ bottom: "calc(10px + env(safe-area-inset-bottom, 0px))", maxWidth: 480, margin: "0 auto" }}>
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/96 p-2 shadow-xl backdrop-blur">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="flex h-11 w-[74px] flex-col items-center justify-center rounded-xl border border-[var(--line)] text-[11px] font-semibold text-[var(--fg-2)] disabled:opacity-35"
              >
                <Icon name="arrow-left" size={15} />
                上一题
              </button>
              <button
                onClick={() => toggleMark(currentQ?.id)}
                className={`h-11 w-[62px] rounded-xl border text-[11px] font-bold ${
                  marked.has(currentQ?.id ?? -1)
                    ? "border-[#F5C26B] bg-[#FFF3D6] text-[#B45309]"
                    : "border-[var(--line)] text-[var(--fg-muted)]"
                }`}
              >
                {marked.has(currentQ?.id ?? -1) ? "★ 已标记" : "☆ 标记"}
              </button>
              <button
                onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                disabled={currentIndex === questions.length - 1}
                className="h-11 flex-1 rounded-xl text-[13px] font-bold text-white disabled:opacity-40"
                style={{ background: "var(--grad)" }}
              >
                下一题 →
              </button>
            </div>
          </div>
        </FixedLayer>

        {/* 题号悬浮窗 */}
        <FixedLayer>
          <QuestionNav
            total={questions.length}
            current={currentIndex}
            answeredIds={new Set(questions.filter((q) => answers[q.id]).map((q) => q.id))}
            markedIds={marked}
            questionIds={questions.map((q) => q.id)}
            onJump={(i) => { setCurrentIndex(i); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          />
        </FixedLayer>

        <ConfirmDialog
          open={exitAsk}
          title="还没做完哦"
          desc="这场考试的进度已保存，下次可以接着做"
          progress={{ done: answeredCount, total: questions.length }}
          confirmText="继续考试"
          cancelText="先退出"
          onConfirm={() => setExitAsk(false)}
          onCancel={() => { setExitAsk(false); setPhase("select"); }}
        />

        {/* 交卷确认弹窗 */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setShowSubmitConfirm(false)}>
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--line)] p-6 max-w-sm mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
              <p className="text-base text-[var(--fg)] mb-4">
                {Object.keys(answers).length < questions.length
                  ? "还有未作答题目，确认交卷？"
                  : "确认交卷？"}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg)] hover:border-[var(--accent)] transition-smooth"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    submitExam();
                  }}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:opacity-80 transition-smooth"
                >
                  确认交卷
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Result phase
  if (phase === "result" && examResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setReviewMode(false);
              setPhase("select");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--fg)] hover:border-[var(--accent)] transition-smooth"
          >
            <Icon name="arrow-left" size={16} />
            返回
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--fg)]">
            {reviewMode ? "答题记录" : "考试成绩报告"}
          </h1>
          {!reviewMode && (
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
          )}
          {reviewMode && (
            <span className="px-2 py-0.5 rounded bg-[var(--chip)] text-[var(--chip-fg)] text-xs">
              历史记录 · 只读
            </span>
          )}
        </div>
        {reviewMode && selectedPaper && (
          <p className="text-sm text-[var(--fg-muted)] -mt-4">
            {selectedPaper.paper_name}
          </p>
        )}

        {poster && examResult && (
          <ScorePoster
            data={{
              title: selectedPaper?.paper_name?.slice(0, 16) || "模拟考试",
              accuracy: examResult.accuracy,
              total: examResult.totalQuestions,
              correct: examResult.correct,
              seconds: Math.max(0, 120 * 60 - timeLeft),
            }}
            onClose={() => setPoster(false)}
          />
        )}

        {/* Overall score */}
        <div className="card p-6">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-[var(--accent-text)] mb-2">
              {examResult.accuracy}%
            </div>
            <div className="text-sm text-[var(--fg-muted)]">总正确率</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-[var(--surface)]">
              <div className="text-2xl font-bold text-[var(--fg)]">
                {examResult.totalQuestions}
              </div>
              <div className="text-xs text-[var(--fg-muted)]">总题数</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--surface)]">
              <div className="text-2xl font-bold text-[var(--ok)]">
                {examResult.correct}
              </div>
              <div className="text-xs text-[var(--fg-muted)]">正确</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--surface)]">
              <div className="text-2xl font-bold text-[var(--accent-text)]">
                {examResult.wrong}
              </div>
              <div className="text-xs text-[var(--fg-muted)]">错误</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-[var(--surface)]">
              <div className="text-2xl font-bold text-[var(--fg-muted)]">
                {examResult.unanswered}
              </div>
              <div className="text-xs text-[var(--fg-muted)]">未答</div>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-[var(--fg-muted)] tabular-nums">
            {reviewMode ? (
              "历史答题记录（时长未保存）"
            ) : (
              <>
                总用时 {formatTime(examResult.timeUsed)} / 120:00
                {" · "}
                平均每题{" "}
                {examResult.totalQuestions > 0
                  ? Math.round(examResult.timeUsed / examResult.totalQuestions)
                  : 0}
                s
              </>
            )}
          </div>
        </div>

        {/* Module breakdown */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">
            各模块正确率
          </h2>
          <div className="space-y-3">
            {examResult.moduleStats.map((stat) => (
              <div key={stat.module}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--fg)]">{stat.module}</span>
                  <span className="text-sm text-[var(--fg-muted)]">
                    {stat.correct}/{stat.total} ({stat.accuracy}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--chip)] overflow-hidden">
                  <div
                    className={`h-full transition-smooth ${
                      stat.accuracy >= 70
                        ? "bg-[var(--ok-fill)]"
                        : stat.accuracy >= 50
                        ? "bg-[#c98a00]"
                        : "bg-[var(--accent-fill)]"
                    }`}
                    style={{ width: `${stat.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* 逐题详情 */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-[var(--fg)] mb-4">
            逐题答案详情
          </h2>

          {/* 题号网格 */}
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 mb-4">
            {questions.map((q, idx) => {
              const userAns = answers[q.id];
              const correctAns = (q.answer ?? "").trim();
              const isCorrect = userAns === correctAns;
              const hasAnswer = !!userAns;

              return (
                <button
                  key={q.id}
                  onClick={() =>
                    setDetailQuestion((prev) =>
                      prev === q.id ? null : q.id
                    )
                  }
                  className={`xc-light w-8 h-8 rounded text-xs font-medium flex items-center justify-center border transition-smooth ${
                    hasAnswer
                      ? isCorrect
                        ? "border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok-fg)]"
                        : "border-[var(--accent)] bg-[var(--bad-bg)] text-[var(--bad-fg)]"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--fg-muted)]"
                  } ${detailQuestion === q.id ? "ring-2 ring-[var(--accent)]" : ""}`}
                  style={{ animationDelay: `${Math.min(idx, 60) * 7}ms` }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* 详情面板 */}
          {detailQuestion && (() => {
            const q = questions.find((qq) => qq.id === detailQuestion);
            if (!q) return null;
            const idx = questions.indexOf(q);
            const userAns = answers[q.id];
            const correctAns = (q.answer ?? "").trim();
            const isCorrect = userAns === correctAns;
            const hasAnswer = !!userAns;

            return (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
                onClick={() => setDetailQuestion(null)}
              >
                <div
                  className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--fg)]">
                        第 {idx + 1} 题
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          hasAnswer
                            ? isCorrect
                              ? "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
                              : "bg-[var(--bad-bg)] text-[var(--bad-fg)]"
                            : "bg-[var(--chip)] text-[var(--fg-muted)]"
                        }`}
                      >
                        {hasAnswer ? (isCorrect ? "正确" : "错误") : "未作答"}
                      </span>
                      {q.qtype && (
                        <span className="text-xs text-[var(--fg-muted)]">{q.qtype}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setDetailQuestion(null)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--line)] text-xs text-[var(--fg)] hover:border-[var(--accent)] transition-smooth"
                    >
                      关闭
                    </button>
                  </div>

                  <div className="text-sm text-[var(--fg)] leading-relaxed mb-3">
                    {transformImagePath(q.stem || "")}
                  </div>

                  {/* 选项展示：用户选错的标红，选对/正确答案标绿 */}
                  {(() => {
                    const opts = normalizeOptions(q.options);
                    return opts.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {opts.map((opt, i) => {
                          const isSelected = userAns === opt.label;
                          const isCorrectOpt = opt.label === correctAns;
                          let optClass = "px-3 py-2 rounded-lg border text-sm ";
                          if (isSelected && isCorrect) {
                            optClass += "border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok-fg)]";
                          } else if (isSelected && !isCorrect) {
                            optClass += "border-[var(--accent)] bg-[var(--bad-bg)] text-[var(--bad-fg)]";
                          } else if (isCorrectOpt) {
                            optClass += "border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok-fg)]";
                          } else {
                            optClass += "border-[var(--line)] bg-[var(--surface)] text-[var(--fg)]";
                          }
                          return (
                            <div key={i} className={optClass}>
                              <span className="font-medium mr-2">{opt.label}.</span>
                              <span dangerouslySetInnerHTML={{ __html: transformImagePath(opt.text) }} />
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div className="flex items-start gap-2 text-xs mb-2">
                    <span className="text-[var(--fg-muted)]">你的答案：</span>
                    <span className={hasAnswer ? (isCorrect ? "text-[var(--ok-fg)]" : "text-[var(--bad-fg)]") : "text-[var(--fg-muted)]"}>
                      {userAns || "未作答"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs mb-2">
                    <span className="text-[var(--fg-muted)]">正确答案：</span>
                    <span className="text-[var(--ok-fg)] font-medium">{correctAns || "—"}</span>
                  </div>
                  {q.analysis && (
                    <div className="mt-3 pt-3 border-t border-[var(--line)]">
                      <span className="text-xs font-medium text-[var(--fg-muted)] block mb-1">
                        解析：
                      </span>
                      <div
                        className="text-xs text-[var(--fg)] leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: transformImagePath(q.analysis),
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        </div>

      </div>
    );
  }

  return null;
}