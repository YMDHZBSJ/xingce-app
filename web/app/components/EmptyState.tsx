/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */

export default function EmptyState({
  title, desc, action,
}: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <svg width="112" height="88" viewBox="0 0 112 88" fill="none" aria-hidden>
        <rect x="16" y="18" width="56" height="62" rx="10" fill="#FFF1E8" stroke="#F7C9AE" strokeWidth="1.5" />
        <rect x="26" y="30" width="36" height="4" rx="2" fill="#F7C9AE" />
        <rect x="26" y="40" width="26" height="4" rx="2" fill="#FBDCC8" />
        <rect x="26" y="50" width="30" height="4" rx="2" fill="#FBDCC8" />
        <circle cx="78" cy="60" r="20" fill="#FFE9EE" stroke="#F5A9B9" strokeWidth="1.5" />
        <path d="M70 60h16M78 52v16" stroke="#F5A9B9" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-semibold">{title}</p>
      {desc && <p className="text-xs leading-relaxed text-[var(--fg-muted)]">{desc}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
