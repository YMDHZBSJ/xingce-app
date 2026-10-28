"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 返回键导航守卫
 * Next 客户端路由不产生 WebView 历史（canGoBack 恒 false），因此自己维护一份导航栈：
 *   - 首页 "/"                     → 返回 false，交给原生走「再按一次退出」
 *   - 其他页面                     → 回到栈里的上一页；没有上一页则回首页
 *   - 页面注册 __xcPageBack 时优先执行（如做题页弹「还没做完哦」）
 */
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const KEY = "xcNavStack";
const MAX = 30;

function norm(p: string): string {
  const s = (p || "/").split("?")[0].split("#")[0];
  return s.length > 1 ? s.replace(/\/+$/, "") : s || "/";
}
function readStack(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}
function writeStack(s: string[]): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(s.slice(-MAX))); } catch { /* 忽略 */ }
}

export default function BackHandler() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const pathRef = useRef(norm(pathname));

  // 记录导航栈：新页面入栈；若是回到栈中已有页面，则截断到该位置
  useEffect(() => {
    const p = norm(pathname);
    pathRef.current = p;
    const s = readStack();
    const idx = s.lastIndexOf(p);
    if (idx >= 0) {
      writeStack(s.slice(0, idx + 1));
    } else {
      s.push(p);
      writeStack(s);
    }
  }, [pathname]);

  useEffect(() => {
    (window as unknown as { __xcBack?: () => boolean }).__xcBack = () => {
      // 1) 页面自定义拦截（做题页确认框）
      const pageBack = (window as unknown as { __xcPageBack?: () => boolean }).__xcPageBack;
      if (typeof pageBack === "function") {
        try { if (pageBack()) return true; } catch { /* 忽略 */ }
      }

      const cur = pathRef.current;
      // 2) 首页：交给原生退出逻辑
      if (cur === "/") return false;

      // 3) 回导航栈的上一页
      let s = readStack();
      if (s[s.length - 1] !== cur) s.push(cur);
      if (s.length >= 2) {
        s.pop();
        const prev = s[s.length - 1];
        writeStack(s);
        router.push(prev);
        return true;
      }

      // 4) 没有上一页 → 回首页
      writeStack([cur]);
      router.replace("/");
      return true;
    };
    return () => { delete (window as unknown as { __xcBack?: () => boolean }).__xcBack; };
  }, [router]);

  return null;
}
