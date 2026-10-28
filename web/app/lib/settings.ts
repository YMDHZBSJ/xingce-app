"use client";

/** 个人设置：每日目标题数、主题 */
export interface AppSettings {
  dailyGoal: number;
  theme: "light" | "dark" | "system";
}

const KEY = "appSettings";

const DEFAULT: AppSettings = { dailyGoal: 20, theme: "light" };

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? JSON.parse(raw) : {};
    return {
      dailyGoal: [10, 20, 30, 50].includes(Number(s.dailyGoal)) ? Number(s.dailyGoal) : DEFAULT.dailyGoal,
      theme: ["light", "dark", "system"].includes(s.theme) ? s.theme : DEFAULT.theme,
    };
  } catch {
    return DEFAULT;
  }
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...loadSettings(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 忽略 */ }
  applyTheme(next.theme);
  return next;
}

/** 应用主题（system 时跟随系统偏好） */
export function applyTheme(theme: AppSettings["theme"] = loadSettings().theme): void {
  if (typeof document === "undefined") return;
  const dark = theme === "dark" ||
    (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
