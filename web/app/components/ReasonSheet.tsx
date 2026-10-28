"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 */
import { useState } from "react";
import FixedLayer from "./FixedLayer";
import { REASONS, setReason } from "../lib/mistake-reasons";

/** 答错后弹出：这道题为什么错？（可跳过） */
export default function ReasonSheet({
  open, questionId, onClose,
}: { open: boolean; questionId: number | null; onClose: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  if (!open || questionId == null) return null;

  return (
    <FixedLayer>
      <div
        className="fixed inset-0 z-[125] flex items-end justify-center"
        style={{ background: "rgba(30,16,10,.42)" }}
        onClick={onClose}
      >
        <div
          className="reason-sheet w-full max-w-[480px] rounded-t-[26px] bg-[var(--surface)] p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--line)]" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-extrabold">这道题为什么错？</p>
              <p className="mt-0.5 text-[11.5px] text-[var(--fg-muted)]">标记错因，帮你找出真正的短板</p>
            </div>
            <button onClick={onClose} className="text-[12px] font-semibold text-[var(--fg-muted)]">跳过</button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            {REASONS.map((r) => {
              const on = picked === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => setPicked(r.key)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                  style={{
                    background: on ? "var(--grad-soft)" : "var(--chip)",
                    border: on ? "1px solid rgba(244,112,30,.4)" : "1px solid transparent",
                  }}
                >
                  <span className="text-[16px]">{r.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-[var(--fg)]">{r.label}</span>
                    <span className="text-[11px] text-[var(--fg-muted)]">{r.hint}</span>
                  </span>
                  {on && <span className="ml-auto text-[12px] font-bold text-[var(--accent-text)]">✓</span>}
                </button>
              );
            })}
          </div>

          <button
            disabled={!picked}
            onClick={() => { if (picked) { setReason(questionId, picked); onClose(); } }}
            className="xc-btn mt-3 w-full disabled:opacity-40"
          >
            记录错因
          </button>
        </div>
      </div>
    </FixedLayer>
  );
}
