"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 错因标签：记录"为什么错"，用于生成提分画像
 */
export interface ReasonTag {
  key: string;
  label: string;
  icon: string;
  hint: string;
}

export const REASONS: ReasonTag[] = [
  { key: "concept", label: "概念不清", icon: "📚", hint: "知识点本身没记住" },
  { key: "misread", label: "审题失误", icon: "👀", hint: "看错问法或条件" },
  { key: "calc", label: "计算失误", icon: "🧮", hint: "方法对但算错" },
  { key: "time", label: "时间不够", icon: "⏱", hint: "没做完/匆忙选" },
  { key: "guess", label: "蒙的", icon: "🎲", hint: "完全没思路" },
];

const KEY = "wrongReasons"; // { [questionId]: { reason, at } }

export type ReasonMap = Record<string, { reason: string; at: number }>;

export function loadReasons(): ReasonMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReasonMap) : {};
  } catch { return {}; }
}

export function setReason(questionId: number, reason: string): void {
  const map = loadReasons();
  map[String(questionId)] = { reason, at: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* 忽略 */ }
}

export function getReason(questionId: number): string | null {
  return loadReasons()[String(questionId)]?.reason || null;
}

/** 错因占比（只统计有标签的） */
export function reasonStats(): { key: string; label: string; icon: string; count: number; pct: number }[] {
  const map = loadReasons();
  const counts: Record<string, number> = {};
  Object.values(map).forEach((v) => { counts[v.reason] = (counts[v.reason] || 0) + 1; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return REASONS.map((r) => ({
    key: r.key,
    label: r.label,
    icon: r.icon,
    count: counts[r.key] || 0,
    pct: total ? Math.round(((counts[r.key] || 0) / total) * 100) : 0,
  })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
}

/** 根据错因给出提分建议 */
export function reasonAdvice(): string {
  const s = reasonStats();
  if (!s.length) return "多做几道题并标注错因，这里会告诉你「为什么错」，比只看分数有用得多。";
  const top = s[0];
  const map: Record<string, string> = {
    concept: "你的主要问题是知识点不清。建议去「考点图谱」把相关考点的真题连着做 5 道，先把概念吃透。",
    misread: "你的主要问题是审题。做题时先用笔圈出提问词（正确/不正确、最能/不能），再动笔。",
    calc: "你的主要问题是计算。资料分析练「截位直除」和估算，先求对再求快。",
    time: "你的主要问题是时间。用「闪练」限时做题，单题超过 90 秒就强制跳过并标记。",
    guess: "你有很多题是完全没思路。这类题请先看解析再归类，集中攻同一题型的 10 道。",
  };
  return `你 ${top.pct}% 的错误是「${top.label}」。${map[top.key] || ""}`;
}
