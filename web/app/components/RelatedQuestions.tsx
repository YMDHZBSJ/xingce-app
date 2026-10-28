"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { getInsight } from "../lib/ai-insight";

interface KpRef {
  id: number;
  name: string;
}

interface RelatedQuestion {
  id: number;
  qtype: string | null;
  module: string | null;
  year: string | null;
  region: string | null;
  stem: string;
  matched: number;
}

interface RelatedPayload {
  knowledgePoints: (KpRef & { description?: string; module?: string })[];
  relatedQuestions: RelatedQuestion[];
  question?: { id: number; module?: string; qtype?: string; analysis?: string };
}

export default function RelatedQuestions({
  questionId,
  onOpen,
}: {
  questionId: number;
  /** 点开相关题时由外部接管（暂停主计时并弹练习层） */
  onOpen?: (id: number) => void;
}) {
  const [data, setData] = useState<RelatedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    fetch(`/api/question/${questionId}/related?limit=5`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [questionId]);

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-[var(--chip)] mb-3" />
        <div className="h-4 w-full rounded bg-[var(--chip)] mb-2" />
        <div className="h-4 w-2/3 rounded bg-[var(--chip)]" />
      </div>
    );
  }

  if (!data || (data.knowledgePoints.length === 0 && data.relatedQuestions.length === 0)) {
    return null;
  }

  return (
    <div className="card p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[13px]"
          style={{ background: "var(--grad-soft)" }}
        >
          ✨
        </span>
        <span className="text-[13px] font-bold text-[var(--fg)]">AI 分析</span>
        <span className="text-[11px] text-[var(--fg-muted)]">考点 · 同类题</span>
        <span className="ml-auto text-[11px] text-[var(--fg-muted)]">{open ? "收起" : "展开"}</span>
      </button>

      {open && (
      <div className="mt-3 space-y-3">
      {/* 考点分析 */}
      {data.knowledgePoints.length > 0 && (
        <div className="rounded-xl bg-[var(--chip)] p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[var(--fg-2)]">
            <span>🎯</span> 考点分析
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.knowledgePoints.map((kp) => (
              <span key={kp.id} className="rounded-md bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-text)]">
                {kp.name}
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--fg-muted)]">
            {data.knowledgePoints[0]?.description || "该题考查上述考点，建议回到考点图谱做专项巩固"}
          </p>
        </div>
      )}

      {/* 答题思路 + 易错避坑 */}
      {(() => {
        const ins = getInsight(data.question?.module, data.question?.qtype);
        return (
          <>
            <div className="rounded-xl bg-[var(--chip)] p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[var(--fg-2)]">
                <span>🧠</span> 答题思路
              </div>
              <ol className="space-y-1 text-[11.5px] leading-relaxed text-[var(--fg-2)]">
                {ins.thoughts.map((t, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="shrink-0 font-bold text-[var(--brand-1)]">{i + 1}.</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl p-3" style={{ background: "rgba(245,158,11,.10)" }}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold" style={{ color: "#B45309" }}>
                <span>⚠️</span> 易错避坑
              </div>
              <ul className="space-y-1 text-[11.5px] leading-relaxed" style={{ color: "#8A5410" }}>
                {ins.pitfalls.map((t, i) => (
                  <li key={i} className="flex gap-1.5"><span>·</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
          </>
        );
      })()}

      {data.knowledgePoints.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-[var(--fg-muted)]">考点</span>
          {data.knowledgePoints.map((kp) => (
            <Link
              key={kp.id}
              href={`/knowledge?kp=${kp.id}`}
              className="px-2 py-1 rounded-md bg-[var(--chip)] text-xs text-[var(--chip-fg)] hover:bg-[var(--chip)] transition-smooth"
            >
              {kp.name}
            </Link>
          ))}
        </div>
      )}

      {data.relatedQuestions.length > 0 && (
        <ul className="space-y-2">
          {data.relatedQuestions.map((q) => (
            <li key={q.id}>
              <button
                type="button"
                data-testid="related-item"
                onClick={() => onOpen?.(q.id)}
                className="block w-full text-left px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)] transition-smooth"
              >
                <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)] mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--chip)] text-[var(--fg)]">
                    {q.qtype}
                  </span>
                  {q.year && <span>{q.year}年</span>}
                  {q.region && <span>{q.region}</span>}
                  <span className="ml-auto inline-flex items-center gap-1 text-[var(--accent-text)]">
                    去做
                    <Icon name="arrow-right" size={12} />
                  </span>
                </div>
                <p className="text-sm text-[var(--fg)] leading-snug line-clamp-2">
                  {q.stem}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>
      )}
    </div>
  );
}
