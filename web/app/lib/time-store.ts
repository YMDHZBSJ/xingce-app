/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */

/**
 * 单题用时记忆：记录每道题「从看到题到给出答案」的用时（秒）。
 * 再次遇到同一题时用于对比：更慢标红、更快标绿。
 */

const KEY = "questionTimeLast";

type TimeMap = Record<string, number>;

function readMap(): TimeMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return {};
    const out: TimeMap = {};
    for (const [k, v] of Object.entries(obj)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: TimeMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* 存储不可用时静默降级 */
  }
}

/** 上一次该题用时（秒），没有记录返回 null */
export function getLastTime(id: number): number | null {
  const v = readMap()[String(id)];
  return typeof v === "number" ? v : null;
}

/** 记录本次该题用时（秒） */
export function setLastTime(id: number, seconds: number): void {
  const map = readMap();
  map[String(id)] = Math.max(0, Math.round(seconds));
  writeMap(map);
}

export type TimeDelta = "faster" | "slower" | "same" | "first";

/** 与上次用时比较 */
export function compareTime(
  current: number,
  previous: number | null
): TimeDelta {
  if (previous === null) return "first";
  if (current < previous) return "faster";
  if (current > previous) return "slower";
  return "same";
}
