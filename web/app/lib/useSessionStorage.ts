"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useRef } from "react";
import { autoSync } from "./sync-store";

/**
 * 会话状态持久化 Hook：exam / practice 共用
 * - 活跃时自动 debounce 400ms 存入 localStorage
 * - 挂载时提供 restore() 一次性恢复
 * - 完成时调用 clearSession(key) 清除
 */
export function useSessionStorage<T>(
  key: string,
  active: boolean,
  snapshot: () => T,
  deps: unknown[]
): { restore: () => T | null } {
  const restoredRef = useRef(false);

  // 自动保存（debounce 400ms）
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ ...snapshot(), savedAt: Date.now() })
        );
        autoSync(); // 触发匿名云同步（debounce 5s）
      } catch {
        /* 存储不可用时静默降级 */
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // 一次性恢复
  const restore = (): T | null => {
    if (restoredRef.current) return null;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  return { restore };
}

/** 清除会话 */
export function clearSession(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
