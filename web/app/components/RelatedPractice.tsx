"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useMemo, useState } from "react";
import {
  normalizeOptions,
  type Question,
} from "./QuestionCard";
import { addWrongCount } from "../lib/wrong-store";
import Icon from "./Icon";

interface RelatedPracticeProps {
  questionId: number;
  onClose: () => void;
}

export default function RelatedPractice({
  questionId,
  onClose,
}: RelatedPracticeProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPicked(null);
    setRevealed(false);
    fetch(`/api/question/${questionId}`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error("题目加载失败"))
      )
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
  }, [questionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const options = useMemo(
    () => (question ? normalizeOptions(question.options) : []),
    [question]
  );
  const correctLabel = (question?.answer || "").trim().toUpperCase();

  const pick = (label: string) => {
    if (revealed || picked) return;
    setPicked(label);
    const isRight = label === correctLabel;
    if (!isRight) addWrongCount(questionId);
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="相关题练习"
    >
      <div
        className="w-full max-w-3xl my-6 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--fg-muted)]">
            相关题练习（主计时已暂停）
          </span>
          <button
            data-testid="rel-close"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[var(--line)] text-sm text-[var(--fg)] hover:border-[var(--accent)] transition-smooth"
          >
            关闭
          </button>
        </div>

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
          <>
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                <span className="px-2 py-0.5 rounded bg-[var(--chip)] text-[var(--chip-fg)]">
                  {question.module}
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)]">
                  {question.qtype}
                </span>
                {question.year && (
                  <span className="text-[var(--fg-muted)]">{question.year}年</span>
                )}
              </div>
              <div
                className="question-content text-[var(--fg)] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: question.stem || "" }}
              />
            </div>

            <div className="card p-4 space-y-2">
              {options.map((opt) => {
                const isPicked = picked === opt.label;
                const isCorrect = revealed && opt.label === correctLabel;
                const isWrongPick = revealed && isPicked && !isCorrect;
                let cls =
                  "px-3 py-2.5 rounded-lg border text-sm flex gap-2 transition-smooth ";
                if (isCorrect) {
                  cls += "border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok-fg)] ";
                } else if (isWrongPick) {
                  cls += "border-[var(--accent)] bg-[var(--bad-bg)] text-[var(--bad-fg)] ";
                } else if (isPicked) {
                  cls += "border-[var(--accent)] bg-[var(--surface)] text-[var(--fg)] ";
                } else {
                  cls +=
                    "border-[var(--line)] bg-[var(--surface)] text-[var(--fg)] " +
                    (revealed ? "" : "cursor-pointer hover:border-[var(--accent)] ");
                }
                return (
                  <div
                    key={opt.label}
                    data-testid="related-option"
                    onClick={() => pick(opt.label)}
                    className={cls}
                  >
                    <span className="font-semibold">{opt.label}.</span>
                    <span
                      className="flex-1"
                      dangerouslySetInnerHTML={{ __html: opt.text }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="card p-4">
              {!revealed ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-[var(--fg-muted)]">
                    {picked
                      ? `已选 ${picked}，答案不会自动显示`
                      : "先选一个选项，再决定是否查看答案"}
                  </span>
                  <button
                    data-testid="rel-reveal"
                    onClick={() => setRevealed(true)}
                    disabled={!picked}
                    className="ml-auto px-4 py-2 rounded-lg bg-[var(--accent-fill)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-30 transition-smooth"
                  >
                    查看答案
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-[var(--fg-muted)]">
                      你的答案 <span className="text-[var(--fg)]">{picked ?? "—"}</span>
                      {" · "}正确答案{" "}
                      <span
                        className={
                          picked === correctLabel
                            ? "text-[var(--ok)] font-semibold"
                            : "text-[var(--accent-text)] font-semibold"
                        }
                      >
                        {correctLabel || "—"}
                      </span>
                    </span>
                    <span
                      className={
                        picked === correctLabel
                          ? "text-[var(--ok)]"
                          : "text-[var(--accent-text)]"
                      }
                    >
                      {picked === correctLabel ? "答对了" : "答错了，已记入错题本"}
                    </span>
                  </div>

                  {question.analysis && (
                    <div>
                      <div className="text-sm text-[var(--fg-muted)] mb-1">解析：</div>
                      <div
                        className="question-content text-sm text-[var(--fg)] leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: question.analysis }}
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg)] hover:border-[var(--accent)] inline-flex items-center gap-1.5"
                    >
                      回到原题
                      <Icon name="arrow-right" size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
