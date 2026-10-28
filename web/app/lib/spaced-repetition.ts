"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 间隔重复 + 一题三练：
 * 错题/收藏题进入复习队列，按 1天 → 3天 → 7天 → 15天 递进；
 * 连续答对 3 次视为掌握，自动移出队列。
 */
export interface ReviewItem {
  id: number;
  stage: number;      // 0/1/2/3（3 = 已掌握）
  nextAt: number;     // 下次复习时间戳
  lastAt: number;
  correctStreak: number;
  addedAt: number;
}

const KEY = "reviewQueue";
const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;
const INTERVALS = [5 * MIN, DAY, 3 * DAY, 7 * DAY];

function read(): ReviewItem[] {
  if (typeof window === "undefined") return [];
  try {
    const arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(arr) ? arr.filter((x) => x && typeof x.id === "number") : [];
  } catch { return []; }
}

function write(list: ReviewItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("xc-review", { detail: list.length }));
  } catch { /* 忽略 */ }
}

/** 加入复习队列（重复加入不重置进度） */
export function enqueueReview(id: number): void {
  const list = read();
  if (list.some((x) => x.id === id)) return;
  list.push({ id, stage: 0, nextAt: Date.now() + INTERVALS[0], lastAt: 0, correctStreak: 0, addedAt: Date.now() });
  write(list);
}

export function reviewList(): ReviewItem[] {
  return read().filter((x) => x.stage < 3).sort((a, b) => a.nextAt - b.nextAt);
}

/** 今日待复习（到期或已过期的） */
export function dueNow(): ReviewItem[] {
  const now = Date.now();
  return reviewList().filter((x) => x.nextAt <= now);
}

/** 记录一次复习结果：答对升期、答错重置 */
export function recordReview(id: number, correct: boolean): void {
  const list = read();
  const item = list.find((x) => x.id === id);
  if (!item) return;
  if (correct) {
    item.correctStreak += 1;
    item.stage = Math.min(3, item.stage + 1);
    if (item.correctStreak >= 3 || item.stage >= 3) {
      item.stage = 3;
      item.nextAt = Number.MAX_SAFE_INTEGER;
    } else {
      item.nextAt = Date.now() + INTERVALS[Math.min(INTERVALS.length - 1, item.stage)];
    }
  } else {
    item.correctStreak = 0;
    item.stage = 0;
    item.nextAt = Date.now() + INTERVALS[0];
  }
  item.lastAt = Date.now();
  write(list);
}

export function removeFromReview(id: number): void {
  write(read().filter((x) => x.id !== id));
}

export function onReviewChange(cb: (n: number) => void): () => void {
  const h = (e: Event) => cb(Number((e as CustomEvent).detail) || 0);
  window.addEventListener("xc-review", h);
  return () => window.removeEventListener("xc-review", h);
}
