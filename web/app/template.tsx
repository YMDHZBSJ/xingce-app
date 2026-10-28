"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
/**
 * 路由级过渡：App Router 的 template 在每次导航时重新挂载，
 * 用 CSS 动画实现「页面进入」效果（无需第三方动画库）。
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="xc-page">{children}</div>;
}
