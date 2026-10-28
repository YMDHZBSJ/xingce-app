"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 */
import { usePathname, useRouter } from "next/navigation";

/** 一级（Tab）页面不显示返回键 */
const TAB_ROUTES = ["/", "/search", "/practice", "/exam", "/me", "/wrong"];

export default function BackBar() {
  const raw = usePathname() || "/";
  // 静态导出可能带尾斜杠（/me/），统一规范化后再判断
  const pathname = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
  const router = useRouter();
  const hide =
    TAB_ROUTES.includes(pathname) ||
    pathname.startsWith("/practice") ||
    pathname.startsWith("/exam") ||
    pathname.startsWith("/daily");
  if (hide) return null;

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      aria-label="返回"
      className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)]/90 shadow-sm backdrop-blur"
      style={{ marginTop: 6 }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
