"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 返回键路由守卫（替代 WebView 历史判断）
 * Next 客户端路由不产生 WebView 历史，canGoBack() 恒为 false，
 * 因此把「返回去哪」的决定放到 JS 层：
 *   - 首页("/")            → 交给原生走「再按一次退出」
 *   - 一级 Tab 页          → 回首页
 *   - 其他（二级页）        → 能后退就后退，否则回首页
 */
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const TABS = ["/", "/practice", "/exam", "/wrong", "/me"];

export default function BackHandler() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    // 返回处理：返回 true 表示已消费（不退出 App）
    (window as unknown as { __xcBack?: () => boolean }).__xcBack = () => {
      // 页面自定义拦截（如做题页要先弹「还没做完哦」）
      const pageBack = (window as unknown as { __xcPageBack?: () => boolean }).__xcPageBack;
      if (typeof pageBack === "function") {
        try { if (pageBack()) return true; } catch { /* 忽略 */ }
      }

      const p = (pathRef.current || "/").replace(/\/+$/, "") || "/";

      // 首页：不消费，交给原生「再按一次退出」
      if (p === "/") return false;

      // 一级 Tab：回首页
      if (TABS.includes(p)) {
        router.replace("/");
        return true;
      }

      // 二级页：优先浏览器退栈；退不了就回首页
      if (window.history.length > 1) {
        router.back();
      } else {
        router.replace("/");
      }
      return true;
    };
    return () => { delete (window as unknown as { __xcBack?: () => boolean }).__xcBack; };
  }, [router]);

  return null;
}
