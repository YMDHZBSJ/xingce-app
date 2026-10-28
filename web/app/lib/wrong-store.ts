/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */

/**
 * 错题本地存储：以「题目 id + 错误次数」聚合，供错题本按错误次数排序与重做。
 * 兼容旧版 wrongRecords（数组，按出现次数聚合迁移）。
 */

import { autoSync } from "./sync-store";

export interface WrongEntry {
  id: number;
  count: number;
  lastAt: number;
}

const KEY = "wrongStats";
const LEGACY_RECORDS = "wrongRecords";

function readRaw(): WrongEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e: unknown) => e && typeof (e as WrongEntry).id === "number")
      .map((e: WrongEntry) => ({
        id: e.id,
        count: Math.max(1, Number(e.count) || 1),
        lastAt: Number(e.lastAt) || 0,
      }));
  } catch {
    return [];
  }
}

function writeRaw(list: WrongEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    autoSync(); // 触发匿名云同步
  } catch {
    /* 存储不可用时静默降级 */
  }
}

/** 读取错题条目；首次运行会从旧格式迁移 */
export function loadWrongEntries(): WrongEntry[] {
  if (typeof window === "undefined") return [];
  const current = readRaw();
  if (current.length > 0) return current;

  // 迁移旧格式：wrongRecords 里每条出现一次算错一次
  try {
    const legacy = window.localStorage.getItem(LEGACY_RECORDS);
    if (!legacy) return [];
    const records = JSON.parse(legacy);
    if (!Array.isArray(records)) return [];

    const map = new Map<number, WrongEntry>();
    for (const r of records) {
      if (!r || typeof r.id !== "number") continue;
      const found = map.get(r.id);
      if (found) {
        found.count += 1;
        found.lastAt = Math.max(found.lastAt, Number(r.timestamp) || 0);
      } else {
        map.set(r.id, {
          id: r.id,
          count: 1,
          lastAt: Number(r.timestamp) || 0,
        });
      }
    }
    const migrated = [...map.values()];
    if (migrated.length > 0) {
      writeRaw(migrated);
      // 迁移完成即清掉旧格式（旧格式带完整题干，很占空间）
      window.localStorage.removeItem(LEGACY_RECORDS);
    }
    return migrated;
  } catch {
    return [];
  }
}

/** 记录一次做错，返回该题累计错误次数 */
export function addWrongCount(id: number): number {
  const list = loadWrongEntries();
  const found = list.find((e) => e.id === id);
  if (found) {
    found.count += 1;
    found.lastAt = Date.now();
    writeRaw(list);
    return found.count;
  }
  const entry: WrongEntry = { id, count: 1, lastAt: Date.now() };
  writeRaw([...list, entry]);
  return 1;
}

/** 批量记录做错（一次写入，供交卷时汇总使用），返回实际新增/累加的题数 */
export function addWrongCounts(ids: number[]): number {
  if (!ids.length) return 0;
  const list = loadWrongEntries();
  const now = Date.now();
  const map = new Map(list.map((e) => [e.id, e]));
  const seen = new Set<number>();
  let n = 0;
  ids.forEach((id) => {
    if (seen.has(id)) return;
    seen.add(id);
    n += 1;
    const found = map.get(id);
    if (found) {
      found.count += 1;
      found.lastAt = now;
    } else {
      const entry: WrongEntry = { id, count: 1, lastAt: now };
      map.set(id, entry);
      list.push(entry);
    }
  });
  writeRaw(list);
  return n;
}

/** 当前累计错误次数（不增加） */
export function wrongCountOf(id: number): number {
  return loadWrongEntries().find((e) => e.id === id)?.count ?? 0;
}

/** 从错题本移除 */
export function removeWrong(id: number): void {
  writeRaw(loadWrongEntries().filter((e) => e.id !== id));
}

/** 清空错题本 */
export function clearWrong(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(LEGACY_RECORDS);
  } catch {
    /* ignore */
  }
}

/** 按模块分组，组内按错误次数降序；组间按题目数量降序 */
export function groupByModule<
  T extends { id: number; count: number; module?: string | null }
>(items: T[]): { module: string; items: T[]; totalErrors: number }[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const key = it.module || "未分类";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }
  return [...groups.entries()]
    .map(([module, list]) => ({
      module,
      items: [...list].sort(
        (a, b) => b.count - a.count || a.id - b.id
      ),
      totalErrors: list.reduce((s, x) => s + x.count, 0),
    }))
    .sort(
      (a, b) =>
        b.items.length - a.items.length || b.totalErrors - a.totalErrors
    );
}
