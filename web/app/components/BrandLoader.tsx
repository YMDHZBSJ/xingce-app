/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */

export default function BrandLoader({ text = "加载中…" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="xc-loader" />
      <span className="text-xs text-[var(--fg-muted)]">{text}</span>
    </div>
  );
}
