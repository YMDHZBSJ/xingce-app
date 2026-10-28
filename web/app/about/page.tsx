"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { AUTHOR, COPYRIGHT } from "../lib/author";

const ROWS = [
  { k: "应用名称", v: AUTHOR.appName },
  { k: "QQ 交流群", v: "1048681103" },
  { k: "版本", v: `v${AUTHOR.version}` },
  { k: "题库范围", v: "2022—2026 · 22,298 题" },
  { k: "题库来源", v: "https://github.com/ERRRC/xingcezhenti" },
];

export default function AboutPage() {
  return (
    <div className="xc-fade">
      <div className="pt-3">
        <div className="xc-title">关于</div>
        <div className="xc-sub">作者与版权信息</div>
      </div>

      <div
        className="relative mt-4 overflow-hidden rounded-3xl p-5 text-white"
        style={{ background: "var(--grad)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="absolute -right-10 -bottom-14 h-40 w-40 rounded-full" style={{ background: "rgba(255,255,255,.14)" }} />
        <div className="relative flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-2xl text-xl font-extrabold"
            style={{ width: 54, height: 54, background: "rgba(255,255,255,.24)" }}
          >
            {AUTHOR.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold">{AUTHOR.displayName}</div>
            <div className="text-[11.5px] opacity-90">作者 · 设计与开发</div>
          </div>
        </div>
        <p className="relative mt-3 text-[11.5px] leading-relaxed opacity-95">{COPYRIGHT} · 保留所有权利</p>
      </div>

      <div className="xc-card mt-3">
        {ROWS.map((r, i) => (
          <div
            key={r.k}
            className="flex items-start justify-between gap-4 py-2.5 text-[12.5px]"
            style={{ borderBottom: i === ROWS.length - 1 ? "none" : "1px solid var(--line)" }}
          >
            <span className="shrink-0 text-[var(--fg-muted)]">{r.k}</span>
            {r.v.startsWith("http") ? (
              <a
                href={r.v}
                target="_blank"
                rel="noreferrer noopener"
                className="min-w-0 break-all text-right font-semibold text-[var(--accent-text)] underline decoration-[rgba(233,69,96,.35)] underline-offset-2"
              >
                {r.v.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span className="text-right font-semibold text-[var(--fg-2)]">{r.v}</span>
            )}
          </div>
        ))}
      </div>

      <div className="xc-card mt-3">
        <div className="card-t">联系作者</div>
        <a href={AUTHOR.github} target="_blank" rel="noreferrer" className="xc-row" style={{ padding: "10px 0" }}>
          <span className="xc-icon-box">🐙</span>
          <span className="text-sm font-semibold">GitHub</span>
          <span className="ml-auto text-[11.5px] text-[var(--fg-muted)]">YMDHZBSJ ›</span>
        </a>
        <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
          如需授权合作、定制或问题反馈，请通过 GitHub 联系作者。
        </p>
      </div>

      <div className="mt-4 text-center text-[11px] text-[var(--fg-muted)]">
        {COPYRIGHT}
      </div>
    </div>
  );
}
