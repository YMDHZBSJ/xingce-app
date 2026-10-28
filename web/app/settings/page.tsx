"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 */
import { useEffect, useState } from "react";
import { loadSettings, saveSettings, applyTheme, type AppSettings } from "../lib/settings";

const GOALS = [10, 20, 30, 50];
const THEMES: { value: AppSettings["theme"]; label: string; icon: string }[] = [
  { value: "light", label: "浅色", icon: "☀️" },
  { value: "dark", label: "深色", icon: "🌙" },
  { value: "system", label: "跟随系统", icon: "⚙️" },
];

export default function SettingsPage() {
  const [s, setS] = useState<AppSettings>({ dailyGoal: 20, theme: "light" });

  useEffect(() => {
    const cur = loadSettings();
    setS(cur);
    applyTheme(cur.theme);
  }, []);

  const update = (patch: Partial<AppSettings>) => setS(saveSettings(patch));

  return (
    <div className="xc-fade">
      <div className="pt-3">
        <div className="xc-title">个人设置</div>
        <div className="xc-sub">每日目标与外观</div>
      </div>

      {/* 每日目标 */}
      <div className="xc-card mt-4">
        <div className="card-t">每日目标题数</div>
        <p className="mb-3 text-[11.5px] text-[var(--fg-muted)]">首页「今日达成目标」按这个数量计算进度</p>
        <div className="grid grid-cols-4 gap-2.5">
          {GOALS.map((g) => {
            const on = s.dailyGoal === g;
            return (
              <button
                key={g}
                onClick={() => update({ dailyGoal: g })}
                className={`h-[46px] rounded-[14px] text-[15px] font-bold transition-all ${
                  on ? "text-white" : "border border-[var(--line)] bg-[var(--surface)] text-[var(--fg-2)]"
                }`}
                style={on ? { background: "var(--grad)", boxShadow: "0 8px 18px -8px rgba(233,69,96,.65)" } : undefined}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* 主题 */}
      <div className="xc-card mt-3">
        <div className="card-t">主题外观</div>
        <div className="space-y-2">
          {THEMES.map((t) => {
            const on = s.theme === t.value;
            return (
              <button
                key={t.value}
                onClick={() => update({ theme: t.value })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all"
                style={{
                  background: on ? "var(--grad-soft)" : "transparent",
                  border: on ? "1px solid rgba(244,112,30,.35)" : "1px solid var(--line)",
                }}
              >
                <span className="text-[17px]">{t.icon}</span>
                <span className="text-[13.5px] font-bold text-[var(--fg)]">{t.label}</span>
                {on && (
                  <span
                    className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white"
                    style={{ background: "var(--grad)" }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-[var(--fg-muted)]">设置只保存在本机</p>
    </div>
  );
}
