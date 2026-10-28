"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
/** 练习历史（本地）：用于首页正确率趋势、打卡与今日进度 */
export interface PracticeRecord {
  at: number;      // 时间戳
  total: number;   // 题量
  answered: number;
  correct: number;
  accuracy: number;
  module?: string;
}

const KEY = "practiceHistory";
const MAX = 40;

export function addPracticeRecord(r: Omit<PracticeRecord, "at">): void {
  if (typeof window === "undefined") return;
  try {
    const list: PracticeRecord[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    list.push({ ...r, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch { /* 忽略 */ }
}

export function loadHistory(): PracticeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

/** 最近 7 天的练习天数（用于打卡条） */
export function recentDays(): { label: string; active: boolean; today: boolean }[] {
  const list = loadHistory();
  const dayKey = (t: number) => new Date(t).toDateString();
  const set = new Set(list.map((r) => dayKey(r.at)));
  const today = dayKey(Date.now());
  const labels = ["日", "一", "二", "三", "四", "五", "六"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = d.toDateString();
    return { label: labels[d.getDay()], active: set.has(k), today: k === today };
  });
}

/** 今日已完成题数 */
export function todayCount(): number {
  const list = loadHistory();
  const today = new Date().toDateString();
  return list.filter((r) => new Date(r.at).toDateString() === today)
    .reduce((a, r) => a + (r.answered || 0), 0);
}
