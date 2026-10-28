"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * App 风格确认弹窗（替代系统 confirm）
 */
import FixedLayer from "./FixedLayer";

export default function ConfirmDialog({
  open, title, desc, confirmText = "确定", cancelText = "取消", danger, progress, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  desc?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  /** 进度提示，例如 { done: 3, total: 5 } → 显示「已答 3 / 5 题」 */
  progress?: { done: number; total: number };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <FixedLayer>
      <div
        className="fixed inset-0 z-[130] flex items-center justify-center px-8"
        style={{ background: "rgba(30,16,10,.42)", backdropFilter: "blur(4px)" }}
        onClick={onCancel}
      >
        <div
          className="confirm-card w-full max-w-[300px] overflow-hidden rounded-[26px] bg-[var(--surface)] text-center"
          style={{ boxShadow: "0 26px 60px -18px rgba(120,60,30,.45)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 pb-4 pt-6">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-[22px]"
              style={{
                background: danger ? "rgba(220,38,38,.10)" : "var(--grad-soft)",
              }}
            >
              {danger ? "🗑️" : "💬"}
            </div>
            <p className="text-[16px] font-extrabold text-[var(--fg)]">{title}</p>
            {desc && <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">{desc}</p>}
            {progress && progress.total > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <span
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold tabular-nums"
                  style={{ background: "var(--grad-soft)", color: "var(--accent-text)" }}
                >
                  已答 {progress.done} / {progress.total} 题
                </span>
                <span className="text-[11px] text-[var(--fg-muted)] tabular-nums">
                  {progress.total - progress.done > 0 ? `还剩 ${progress.total - progress.done} 题` : "已全部作答"}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2 p-3 pt-0">
            <button
              onClick={onCancel}
              className="h-11 flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[13.5px] font-bold text-[var(--fg-2)]"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="h-11 flex-1 rounded-xl text-[13.5px] font-bold text-white"
              style={
                danger
                  ? { background: "linear-gradient(135deg,#F87171,#DC2626)" }
                  : { background: "var(--grad)", boxShadow: "0 8px 18px -8px rgba(233,69,96,.7)" }
              }
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </FixedLayer>
  );
}
