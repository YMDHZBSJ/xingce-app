"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useMemo, useState } from "react";
import { normalizeOptions, transformImagePath, type Question } from "./QuestionCard";
import Icon from "./Icon";
import { addWrongCount } from "../lib/wrong-store";

interface DrillOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

interface WrongDrillProps {
  question: Question;
  initialWrongCount: number;
  onExit: () => void;
  onCorrect: () => void;
  onCountChange: (n: number) => void;
  onRemove?: () => void;
  /** 在错题序列中的位置（从 0 开始） */
  index?: number;
  /** 错题序列总数 */
  total?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 打乱选项并把正确答案重映射到新的字母，保证不会出现两个答案 */
function buildOptions(question: Question): {
  options: DrillOption[];
  correctLabel: string | null;
  correctText: string | null;
} {
  const base = normalizeOptions(question.options);
  if (base.length === 0) {
    return { options: [], correctLabel: null, correctText: null };
  }

  const answerLabel = (question.answer || "").trim().toUpperCase();
  let correctIdx = base.findIndex((o) => o.label === answerLabel);
  if (correctIdx < 0) correctIdx = base.findIndex((o) => o.correct);

  if (correctIdx < 0) {
    return { options: [], correctLabel: null, correctText: null };
  }

  const items = base.map((o, i) => ({ text: o.text, isCorrect: i === correctIdx }));
  const shuffled = shuffle(items);

  const options: DrillOption[] = shuffled.map((it, i) => ({
    label: String.fromCharCode(65 + i),
    text: it.text,
    isCorrect: it.isCorrect,
  }));

  const correct = options.find((o) => o.isCorrect)!;
  return { options, correctLabel: correct.label, correctText: correct.text };
}

export default function WrongDrill({
  question,
  initialWrongCount,
  onExit,
  onCorrect,
  onCountChange,
  onRemove,
  index,
  total,
  onPrev,
  onNext,
}: WrongDrillProps) {
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"asking" | "wrong" | "correct">("asking");
  const [wrongTimes, setWrongTimes] = useState(initialWrongCount);

  const { options, correctLabel, correctText } = useMemo(
    () => buildOptions(question),
    // 每次重做（attempt 变化）都重新洗牌
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [question.id, attempt]
  );

  if (options.length === 0) {
    return (
      <div className="card p-6 space-y-3">
        <p className="text-sm text-[var(--accent-text)]">
          这道题缺少可用的答案数据，无法重做。
        </p>
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg)] hover:border-[var(--accent)]"
        >
          返回
        </button>
      </div>
    );
  }

  const choose = (label: string) => {
    if (status !== "asking") return;
    setSelected(label);

    if (label === correctLabel) {
      setStatus("correct");
      onCorrect();
      return;
    }

    // 做错：持久化累计次数 + 弹出警告，警告关闭后同一题重做
    const n = addWrongCount(question.id);
    setWrongTimes(n);
    onCountChange(n);
    setStatus("wrong");
  };

  const retrySame = () => {
    setStatus("asking");
    setSelected(null);
    setAttempt((a) => a + 1); // 重新洗牌
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent-text)] transition-smooth"
          >
            <Icon name="arrow-left" size={16} />
            返回错题列表
          </button>
          <span className="text-xs text-[var(--fg-muted)] tabular-nums">
            {typeof index === "number" && typeof total === "number" && (
              <span className="mr-2 text-[var(--fg)] font-medium">
                第 {(index ?? 0) + 1} / {total} 题
              </span>
            )}
            本题历史错误{" "}
            <span className="text-[var(--accent-text)] font-semibold">{wrongTimes}</span> 次
            {attempt > 0 && <span className="ml-2">· 第 {attempt + 1} 次重做</span>}
          </span>
        </div>
      </div>

      {/* 给定材料（资料分析等） */}
      {(question.material_content || question.material) && (
        <div className="card p-4 bg-[var(--chip)] border border-[var(--line)]">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-[var(--fg-muted)]">
            <Icon name="book" size={14} />
            给定材料
          </div>
          <div
            className="question-content text-sm text-[var(--fg)] leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: transformImagePath(
                question.material_content || question.material || ""
              ),
            }}
          />
        </div>
      )}

      {/* 题干 */}
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
          dangerouslySetInnerHTML={{ __html: transformImagePath(question.stem || "") }}
        />
      </div>

      {/* 选项（乱序，无查看答案入口） */}
      <div className="card p-4 space-y-2">
        <p className="text-xs text-[var(--fg-muted)] mb-2">
          选出正确答案。本题不提供「查看答案」，选错会提示并重做，直到答对。
        </p>

        {options.map((opt) => {
          const isPicked = selected === opt.label;
          const revealed = status === "correct";
          let cls =
            "px-3 py-2.5 rounded-lg border text-sm transition-smooth cursor-pointer flex gap-2 ";
          if (revealed && opt.isCorrect) {
            cls += "border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok-fg)] ";
          } else if (status === "wrong" && isPicked) {
            cls += "border-[var(--accent)] bg-[var(--bad-bg)] text-[var(--bad-fg)] ";
          } else {
            cls += "border-[var(--line)] bg-[var(--surface)] text-[var(--fg)] hover:border-[var(--accent)] ";
          }

          return (
            <div
              key={opt.label}
              role="button"
              tabIndex={0}
              data-testid="drill-option"
              data-label={opt.label}
              onClick={() => choose(opt.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") choose(opt.label);
              }}
              className={cls}
            >
              <span className="font-semibold">{opt.label}.</span>
              <span
                className="flex-1"
                dangerouslySetInnerHTML={{ __html: transformImagePath(opt.text) }}
              />
              {revealed && opt.isCorrect && (
                <Icon name="check" size={16} className="text-[var(--ok)]" />
              )}
            </div>
          );
        })}
      </div>

      {/* 答对后的解析 */}
      {status === "correct" && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2 text-[var(--ok)]">
            <Icon name="check" size={18} />
            <span className="font-semibold">答对了</span>
            <span className="text-sm text-[var(--fg-muted)]">
              正确答案 {correctLabel}. {correctText}
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

          <div className="flex flex-wrap gap-2 pt-1">
            {onRemove && (
              <button
                onClick={onRemove}
                className="px-4 py-2 rounded-lg bg-[var(--ok-fill)] text-white text-sm font-semibold hover:opacity-90"
              >
                已掌握，移出错题本
              </button>
            )}
            <button
              onClick={retrySame}
              className="px-4 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg)] hover:border-[var(--accent)]"
            >
              再打乱做一遍
            </button>
            <button
              onClick={onExit}
              className="px-4 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg)] hover:border-[var(--accent)]"
            >
              返回错题列表
            </button>
          </div>
        </div>
      )}

      {/* 刷题导航：上一题 / 下一题 */}
      <div className="card p-3">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--fg)] disabled:opacity-30 hover:border-[var(--accent)] transition-smooth"
          >
            <Icon name="arrow-left" size={16} />
            上一题
          </button>
          <span className="text-xs text-[var(--fg-muted)] tabular-nums">
            {typeof index === "number" && typeof total === "number"
              ? `第 ${index + 1} / ${total} 题`
              : "错题重做"}
          </span>
          <button
            onClick={onNext}
            disabled={!onNext}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-smooth disabled:opacity-30 ${
              status === "correct"
                ? "bg-[var(--accent-fill)] text-white hover:opacity-90"
                : "bg-[var(--surface)] border border-[var(--line)] text-[var(--fg)] hover:border-[var(--accent)]"
            }`}
          >
            {onNext ? "下一题" : "已是最后一题"}
            <Icon name="arrow-right" size={16} />
          </button>
        </div>
      </div>

      {/* 答错警告：必须在关闭后同题重做 */}
      {status === "wrong" && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md card p-6 border-2 border-[var(--accent)]">
            <div className="flex items-center gap-2 text-[var(--accent-text)] mb-3">
              <Icon name="alert" size={22} />
              <h2 className="text-lg font-bold">又错了</h2>
            </div>
            <p className="text-[var(--fg)] text-base leading-relaxed">
              你已在此题错误
              <span className="mx-1 text-2xl font-bold text-[var(--accent-text)] tabular-nums">
                {wrongTimes}
              </span>
              次
            </p>
            <p className="text-sm text-[var(--fg-muted)] mt-2">
              不提供答案，请重新作答这道题，直到选对为止。
            </p>
            <button
              onClick={retrySame}
              className="mt-5 w-full px-4 py-2.5 rounded-lg bg-[var(--accent-fill)] text-white font-medium hover:opacity-90 transition-smooth"
            >
              再做一遍
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
