"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 单题计时：显示本题用时，并与上次做该题的用时对比
 */
import Icon from "./Icon";

export type TimeDelta = "faster" | "slower" | "same" | "first";

export function compareTime(now: number, prev?: number): TimeDelta {
  if (!prev || prev <= 0) return "first";
  if (now < prev - 3) return "faster";
  if (now > prev + 3) return "slower";
  return "same";
}

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function QuestionTimer({
  seconds, delta, prevSeconds, answered,
}: {
  seconds: number;
  delta: TimeDelta;
  prevSeconds?: number;
  answered?: boolean;
}) {
  const tone =
    delta === "faster" ? "var(--ok)" :
    delta === "slower" ? "var(--accent-text)" : "var(--fg-muted)";

  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <span
        className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold tabular-nums"
        style={{
          borderColor: "rgba(244,112,30,.22)",
          background: "rgba(255,255,255,.9)",
          color: "var(--accent-text)",
        }}
        data-testid="q-timer"
      >
        <Icon name="timer" size={13} />
        本题 {fmt(seconds)}
      </span>

      {answered ? (
        <span className="text-[11px]" style={{ color: tone }}>
          {delta === "faster" && `比上次快 ${Math.max(0, (prevSeconds ?? 0) - seconds)}s 🎉`}
          {delta === "slower" && `比上次慢 ${Math.max(0, seconds - (prevSeconds ?? 0))}s`}
          {delta === "same" && "与上次持平"}
          {delta === "first" && "首次作答"}
        </span>
      ) : (
        <span className="text-[11px] text-[var(--fg-muted)]">计时中…</span>
      )}
    </div>
  );
}
