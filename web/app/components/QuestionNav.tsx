"use client";

/** 做题页题号悬浮窗：已答/未答/标记 三色区分，点击跳题 */
import { useState } from "react";

export default function QuestionNav({
  total, current, answeredIds, markedIds, questionIds, onJump,
}: {
  total: number;
  current: number;
  answeredIds: Set<number>;
  markedIds: Set<number>;
  questionIds: number[];
  onJump: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const answeredCount = answeredIds.size;

  return (
    <div className="fixed left-3 z-40" style={{ bottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}>
      {open && (
        <div className="mb-2 max-h-[46vh] w-[228px] overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]/97 p-2 shadow-xl backdrop-blur">
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-[var(--fg-2)]">答题卡</span>
            <span className="text-[10px] text-[var(--fg-muted)]">已答 {answeredCount}/{total}</span>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {questionIds.map((id, i) => {
              const isCur = i === current;
              const done = answeredIds.has(id);
              const marked = markedIds.has(id);
              const cls = isCur
                ? "bg-[var(--accent-fill)] text-white border-[var(--accent-fill)]"
                : marked
                ? "bg-[#FFF3D6] text-[#B45309] border-[#F5C26B]"
                : done
                ? "bg-[var(--ok-bg)] text-[var(--ok-fg)] border-[var(--ok)]"
                : "bg-[var(--surface)] text-[var(--fg-muted)] border-[var(--line)]";
              return (
                <button
                  key={id}
                  onClick={() => { onJump(i); setOpen(false); }}
                  className={`h-6 rounded-md border text-[10px] font-semibold ${cls}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 px-1 text-[9px] text-[var(--fg-muted)]">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-[var(--ok)]" />已答</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-[#F5C26B]" />标记</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] border border-[var(--line)] bg-white" />未答</span>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)]/95 px-2.5 text-[11px] font-bold text-[var(--fg-2)] shadow-md backdrop-blur"
        aria-label="答题卡"
      >
        <span className="grid grid-cols-2 gap-[2px]">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={`h-1.5 w-1.5 rounded-[1px] ${i < Math.min(4, answeredCount) ? "bg-[var(--ok)]" : "bg-[var(--line)]"}`} />
          ))}
        </span>
        {open ? "收起" : "题号"}
      </button>
    </div>
  );
}
