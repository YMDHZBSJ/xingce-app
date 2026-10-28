"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useState } from "react";
import QuestionCard, { type Question } from "./QuestionCard";
import Icon from "./Icon";

interface QuestionModalProps {
  question?: Question | null;
  questionId?: number;
  onClose: () => void;
}

export default function QuestionModal({
  question: initial,
  questionId,
  onClose,
}: QuestionModalProps) {
  const [question, setQuestion] = useState<Question | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);

  // 没有实体时按 id 拉取
  useEffect(() => {
    if (initial) {
      setQuestion(initial);
      setLoading(false);
      return;
    }
    if (!questionId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/question/${questionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("题目加载失败"))))
      .then((d) => {
        if (!cancelled) setQuestion(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initial, questionId]);

  // Esc 关闭 + 锁定背景滚动
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="题目详情"
    >
      {/* 底部抽屉：内容超长时内部滚动，头部与关闭按钮固定，永远不会挡死界面 */}
      <div
        className="xc-sheet w-full max-w-[520px] rounded-t-3xl bg-[var(--surface)] shadow-2xl"
        style={{ maxHeight: "86dvh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 pt-2">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--line)]" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-4 pb-2">
          <h2 className="text-[13px] font-semibold text-[var(--fg-muted)]">题目详情</h2>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--fg)]"
          >
            关闭
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">

        {loading && (
          <div className="card p-6 animate-pulse">
            <div className="h-4 w-1/3 rounded bg-[var(--chip)] mb-3" />
            <div className="h-4 w-full rounded bg-[var(--chip)] mb-2" />
            <div className="h-4 w-2/3 rounded bg-[var(--chip)]" />
          </div>
        )}

        {error && (
          <div className="card p-4 border-[var(--accent)]" role="alert">
            <p className="text-sm text-[var(--accent-text)]">{error}</p>
          </div>
        )}

        {!loading && question && (
          <QuestionCard question={question} showAnswer />
        )}

        <div className="mt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[var(--accent-fill)] text-white text-sm font-medium hover:opacity-90 transition-smooth inline-flex items-center gap-1.5"
          >
            知道了
            <Icon name="check" size={15} />
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
