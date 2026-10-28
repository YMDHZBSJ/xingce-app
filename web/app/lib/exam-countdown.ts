"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 考试倒计时：默认 2026 年 11 月 29 日（周日）上午 9:00
 * 规则：剩余 > 72 小时按「天」倒数；≤ 72 小时改为按「小时」倒数。
 */

export const EXAM_TARGET = new Date(2026, 10, 29, 9, 0, 0); // 月份从 0 开始：10 = 11 月

export interface CountdownInfo {
  /** 状态：upcoming 未开始 / running 进行中（开考后 2 小时内）/ ended 已结束 */
  state: "upcoming" | "running" | "ended";
  /** 展示单位与数值 */
  unit: "day" | "hour" | "minute";
  value: number;
  /** 主文案，例如「29 天」「71 小时」 */
  primary: string;
  /** 副文案 */
  secondary: string;
  /** 是否进入最后 72 小时（用于加大强调） */
  urgent: boolean;
  /** 距离考试开始的毫秒数（负数表示已开始） */
  diffMs: number;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function getCountdown(now: Date = new Date()): CountdownInfo {
  const diffMs = EXAM_TARGET.getTime() - now.getTime();
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;

  const dateLabel = "11月29日 09:00";
  const examName = "2026 国考（行测）";

  // 开考后 120 分钟内视为进行中
  if (diffMs <= 0 && diffMs > -2 * HOUR) {
    const passed = Math.floor(-diffMs / (60 * 1000));
    return {
      state: "running",
      unit: "minute",
      value: passed,
      primary: "考试进行中",
      secondary: `已开考 ${passed} 分钟 · ${dateLabel}`,
      urgent: true,
      diffMs,
    };
  }

  if (diffMs <= -2 * HOUR) {
    return {
      state: "ended",
      unit: "day",
      value: 0,
      primary: "考试已结束",
      secondary: `${examName} · ${dateLabel}`,
      urgent: false,
      diffMs,
    };
  }

  // 最后 72 小时 → 按小时
  if (diffMs <= 72 * HOUR) {
    const hours = Math.floor(diffMs / HOUR);
    const minutes = Math.floor((diffMs % HOUR) / (60 * 1000));
    return {
      state: "upcoming",
      unit: "hour",
      value: hours,
      primary: `${hours} 小时`,
      secondary: `还剩 ${hours} 小时 ${pad(minutes)} 分 · ${dateLabel} 开考`,
      urgent: true,
      diffMs,
    };
  }

  // 常规：按天（向上取整，让「最后一天」显示 1 天而不是 0 天）
  const days = Math.ceil(diffMs / DAY);
  return {
    state: "upcoming",
    unit: "day",
    value: days,
    primary: `${days} 天`,
    secondary: `${examName} · ${dateLabel} 开考`,
    urgent: false,
    diffMs,
  };
}
