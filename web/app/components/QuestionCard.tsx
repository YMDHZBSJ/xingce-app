"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useState, useRef } from "react";
import Icon from "./Icon";
import ZoomViewer, { type ZoomContent } from "./ZoomViewer";
import { isFavorite, toggleFavorite } from "../lib/favorites";

export interface Question {
  id: number;
  stem: string;
  options: any;
  answer: string | null;
  analysis: string | null;
  module: string;
  qtype: string;
  year: number | string | null;
  region: string | null;
  paper_name: string | null;
  knowledge_points?: string | null;
  material?: string | null;        // 材料原文（资料分析题用）
  material_content?: string | null; // 材料内容（备用）
}

export interface NormalizedOption {
  label: string;
  text: string;
  correct: boolean;
}

/** 把 API 返回的 options（对象数组 / JSON 字符串 / 字符串数组）统一成 {label,text,correct} */
export function normalizeOptions(raw: any): NormalizedOption[] {
  if (!raw) return [];
  let arr: any[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      arr = Array.isArray(parsed) ? parsed : [];
    } catch {
      arr = raw.split(/\n|；|;/).filter((s) => s.trim());
    }
  }
  return arr.map((o, i) => {
    const fallback = String.fromCharCode(65 + i);
    if (typeof o === "string") {
      const m = o.match(/^([A-D])[.、．）)]\s*([\s\S]*)$/);
      return { label: m ? m[1] : fallback, text: m ? m[2] : o, correct: false };
    }
    const obj = o || {};
    return {
      label: obj.label || obj.option || fallback,
      text: obj.text ?? obj.content ?? obj.value ?? "",
      correct: !!(obj.is_correct || obj.isCorrect || obj.correct),
    };
  });
}


/** 清洗题目富文本里的多余空白：不间断空格、连续换行、空段落、行首空白 */
export function cleanRichText(html?: string | null): string {
  if (!html) return "";
  return String(html)
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br/><br/>")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+/, "")
    .trim();
}

export function transformImagePath(html: string): string {
  // Convert ../90-图片/ paths to /images/
  return (html || "").replace(/\.\.\/90-图片\//g, "/images/");
}

function truncateStem(stem: string, maxLen: number = 200): string {
  // Remove HTML tags for preview
  const text = stem.replace(/<[^>]+>/g, "").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

interface QuestionCardProps {
  question: Question;
  showAnswer?: boolean;
  compact?: boolean;
  onAnswerSelect?: (questionId: number, selectedAnswer: string) => void;
  selectedAnswer?: string;
  isCorrect?: boolean | null;
  /** 隐藏内部"查看答案解析"开关，由外部按钮控制显隐（专练/考试用） */
  hideToggle?: boolean;
  /** 是否在选项上标出正确项（答案为绿色） */
  markCorrect?: boolean | null;
}

export default function QuestionCard({
  question,
  showAnswer = false,
  compact = false,
  onAnswerSelect,
  selectedAnswer,
  isCorrect = null,
  hideToggle = false,
  markCorrect = null,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(showAnswer);
  const [showFullStem, setShowFullStem] = useState(!compact);
  const [zoom, setZoom] = useState<ZoomContent>(null);
  const [fav, setFav] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  /** 长按 500ms 打开放大阅读；点击图片可全屏查看 */
  const bindZoom = (html: string, title: string) => ({
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onTouchStart: () => {
      longPressed.current = false;
      pressTimer.current = setTimeout(() => {
        longPressed.current = true;
        setZoom({ type: "text", html, title });
      }, 500);
    },
    onTouchEnd: () => { if (pressTimer.current) clearTimeout(pressTimer.current); },
    onTouchMove: () => { if (pressTimer.current) clearTimeout(pressTimer.current); },
    onClick: (e: React.MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "IMG") {
        e.stopPropagation();
        setZoom({ type: "image", src: (el as HTMLImageElement).src });
        return;
      }
      if (longPressed.current) { e.stopPropagation(); longPressed.current = false; }
    },
    className: "q-zoomable",
  });


  useEffect(() => { setFav(isFavorite(question.id)); }, [question.id]);

  // 换题时重置展开状态，避免上一题的展开被带到下一题
  useEffect(() => {
    setExpanded(showAnswer);
    setShowFullStem(!compact);
    // 只在题目切换时重置，不跟随 showAnswer 的其它变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  // 作答后（showAnswer 由 false 变 true）自动展开答案解析；
  // showAnswer 保持 true 时用户手动收起不会被强行展开
  useEffect(() => {
    if (showAnswer) setExpanded(true);
  }, [showAnswer]);

  const options: NormalizedOption[] = normalizeOptions(question.options);

  const transformedStem = transformImagePath(cleanRichText(question.stem));
  const transformedAnalysis = transformImagePath(cleanRichText(question.analysis));
  const previewStem = truncateStem(question.stem || "");

  const handleOptionClick = (opt: NormalizedOption) => {
    if (onAnswerSelect) {
      onAnswerSelect(question.id, opt.label);
    }
  };

  return (
    <div className="card relative p-4 mb-4">
      {/* 收藏：贴在卡片右上角，不占布局 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const next = toggleFavorite({
            id: question.id, module: question.module, qtype: question.qtype, stem: question.stem,
          });
          setFav(next);
        }}
        aria-label={fav ? "取消收藏" : "收藏题目"}
        className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90"
        style={{ color: fav ? "#F59E0B" : "var(--fg-muted)" }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
          <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Header: module, qtype, year, region */}
      <div className="mb-3 flex flex-wrap items-center gap-2 pr-9 text-xs">
        <span className="px-2 py-0.5 rounded bg-[var(--chip)] text-[var(--chip-fg)]">
          {question.module}
        </span>
        <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--fg)]">
          {question.qtype}
        </span>
        {question.year && (
          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--fg-muted)]">
            {question.year}年
          </span>
        )}
        {question.region && (
          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--fg-muted)]">
            {question.region}
          </span>
        )}
        {question.paper_name && (
          <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--fg-muted)]">
            {question.paper_name}
          </span>
        )}
      </div>

      {/* Stem */}
      <div className="mb-3">
        {/* 资料分析题：先展示材料 */}
        {(question.material || question.material_content) && (
          <div className="card p-4 bg-[var(--chip)] mb-4 border border-[var(--line)]">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-[var(--fg-muted)]">
              <Icon name="book" size={14} />
              给定材料
            </div>
            <div
              {...bindZoom(
                transformImagePath(cleanRichText(question.material_content || question.material)),
                "材料 · 长按放大"
              )}
              dangerouslySetInnerHTML={{
                __html: transformImagePath(
                  cleanRichText(question.material_content || question.material)
                ),
              }}
            />
            {(question.material_content || question.material || "").length > 60 && (
              <div className="mt-2 flex justify-end">
                <span className="zoom-hint">⤢ 长按放大材料</span>
              </div>
            )}
          </div>
        )}
        {compact && !showFullStem ? (
          <div>
            <p className="text-[var(--fg)] leading-relaxed">{previewStem}</p>
            <button
              onClick={() => setShowFullStem(true)}
              className="text-[var(--accent-text)] text-sm mt-1 hover:opacity-80"
            >
              查看完整题目 →
            </button>
          </div>
        ) : (
          <div
            {...bindZoom(transformedStem, "题干 · 长按放大")}
            dangerouslySetInnerHTML={{ __html: transformedStem }}
          />
        )}
        {(() => {
          const plain = String(question.stem || "").replace(/<[^>]+>/g, "");
          return plain.length > 60 ? (
            <div className="mt-1.5 flex justify-end">
              <span className="zoom-hint">⤢ 长按放大题干</span>
            </div>
          ) : null;
        })()}
      </div>

      {/* Options */}
      {options.length > 0 && (
        <div className="space-y-2 mb-3">
          {options.map((opt, idx) => {
            const isSelected = selectedAnswer === opt.label;
            const isAnswerCorrect =
              !!question.answer && opt.label === question.answer.trim();

            let optionClass =
              "px-3 py-2 rounded-lg border text-sm transition-smooth " +
              (onAnswerSelect ? "cursor-pointer " : "");
            if (isSelected && isCorrect === true) {
              optionClass += "border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok-fg)] ";
            } else if (isSelected && isCorrect === false) {
              optionClass += "border-[var(--accent)] bg-[var(--bad-bg)] text-[var(--bad-fg)] ";
            } else if ((markCorrect ?? expanded) && isAnswerCorrect) {
              optionClass += "border-[var(--ok)] bg-[var(--ok-bg)] text-[var(--ok-fg)] ";
            } else if (isSelected) {
              // 已选中但答案未揭晓时用紫色边线框（用户要求）
              optionClass +=
                "border-purple-500 bg-purple-50 text-[var(--fg)] ring-1 ring-purple-500 ";
            } else {
              optionClass +=
                "border-[var(--line)] bg-[var(--surface)] text-[var(--fg)] hover:border-[var(--accent)] ";
            }

            return (
              <div
                key={idx}
                className={`${optionClass} xc-opt`}
                onClick={() => handleOptionClick(opt)}
              >
                <span className="font-medium mr-2">{opt.label}.</span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: transformImagePath(opt.text),
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 答案解析：开关由外部控制时隐藏自身按钮，但内容仍按 expanded 渲染 */}
      <div className="border-t border-[var(--line)] pt-3">
        {!hideToggle && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-[var(--accent-text)] hover:opacity-80 transition-smooth flex items-center gap-1"
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon
                name={expanded ? "chevron-down" : "chevron-right"}
                size={14}
              />
              {expanded ? "收起答案解析" : "查看答案解析"}
            </span>
          </button>
        )}

        {expanded && (
          <div className={`space-y-2 ${hideToggle ? "" : "mt-3"}`}>
            {question.answer && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--fg-muted)]">答案：</span>
                <span className="text-sm font-bold text-[var(--ok)]">{question.answer}</span>
              </div>
            )}
            {question.analysis && (
              <div>
                <span className="text-sm font-medium text-[var(--fg-muted)]">解析：</span>
                <div
                  className="question-content text-sm text-[var(--fg)] leading-relaxed mt-1"
                  dangerouslySetInnerHTML={{ __html: transformedAnalysis }}
                />
              </div>
            )}
            {question.knowledge_points && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-[var(--fg-muted)]">考点：</span>
                <span className="text-sm text-[var(--accent-text)]">{question.knowledge_points}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <ZoomViewer content={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}