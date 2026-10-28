/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */

/**
 * 模拟考试「答题记忆」：按试卷名记录做题进度，供试卷列表展示贴条、
 * 以及「已刷试卷」列表检索。
 */
import { autoSync } from "./sync-store";

export const EXAM_PROGRESS_KEY = "examPaperProgress";

export interface PaperProgress {
  /** 已作答题数 */
  answered: number;
  /** 试卷总题数 */
  total: number;
  /** 最近一次更新（毫秒时间戳） */
  updatedAt: number;
  /** 是否已交卷 */
  submitted?: boolean;
  /** 当时的作答（题目 id -> 选项字母），用于回看答题情况 */
  answers?: Record<string, string>;
}

export type PaperProgressMap = Record<string, PaperProgress>;

export function loadPaperProgress(): PaperProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(EXAM_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PaperProgressMap) : {};
  } catch {
    return {};
  }
}

function writeAll(map: PaperProgressMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXAM_PROGRESS_KEY, JSON.stringify(map));
    autoSync();
  } catch {
    /* 存储不可用时静默降级 */
  }
}

/** 记录/更新某套试卷的进度 */
export function savePaperProgress(
  paperName: string,
  answered: number,
  total: number,
  submitted = false,
  answers?: Record<number, string>
): void {
  if (!paperName) return;
  const map = loadPaperProgress();
  const prev = map[paperName];
  map[paperName] = {
    answered,
    total,
    updatedAt: Date.now(),
    submitted: submitted || prev?.submitted || false,
    answers: answers ? { ...answers } : prev?.answers,
  };
  writeAll(map);
}

/** 交卷时标记完成（保留进度数值） */
export function markPaperSubmitted(
  paperName: string,
  answered: number,
  total: number,
  answers?: Record<number, string>
): void {
  if (!paperName) return;
  const map = loadPaperProgress();
  map[paperName] = {
    answered,
    total,
    updatedAt: Date.now(),
    submitted: true,
    answers: answers ? { ...answers } : map[paperName]?.answers,
  };
  writeAll(map);
}

/** 读取某套试卷的进度 */
export function getPaperProgress(paperName: string): PaperProgress | null {
  if (!paperName) return null;
  return loadPaperProgress()[paperName] ?? null;
}

/** 按最近更新时间倒序列出已刷试卷 */
export function listAttemptedPapers(): Array<{ paperName: string } & PaperProgress> {
  const map = loadPaperProgress();
  return Object.entries(map)
    .map(([paperName, p]) => ({ paperName, ...p }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 清空答题记忆 */
export function clearPaperProgress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(EXAM_PROGRESS_KEY);
    autoSync();
  } catch {
    /* ignore */
  }
}
