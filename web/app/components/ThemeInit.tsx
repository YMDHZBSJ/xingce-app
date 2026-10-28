"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 */
import { useEffect } from "react";
import { applyTheme, loadSettings } from "../lib/settings";

export default function ThemeInit() {
  useEffect(() => {
    applyTheme(loadSettings().theme);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => { if (loadSettings().theme === "system") applyTheme("system"); };
    mq?.addEventListener?.("change", onChange);
    return () => mq?.removeEventListener?.("change", onChange);
  }, []);
  return null;
}
