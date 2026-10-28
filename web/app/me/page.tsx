"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import Link from "next/link";
import { onSoftRefresh } from "../lib/soft-refresh";
import { useEffect, useState } from "react";

const ROWS = [
  { href: "/analyze", icon: "🧠", label: "学习分析", note: "薄弱模块与考点" },
  { href: "/stats", icon: "📊", label: "题型分析", note: "模块占比 · 年份趋势" },
  { href: "/knowledge", icon: "🧭", label: "考点图谱", note: "106 个考点" },
  { href: "/review", icon: "🔁", label: "今日复习", note: "遗忘曲线安排" },
  { href: "/favorites", icon: "⭐", label: "收藏题目", note: "我收藏的题" },
  { href: "/wrong", icon: "📒", label: "错题本", note: "复习错题" },
  { href: "/settings", icon: "⚙️", label: "个人设置", note: "每日目标 · 主题" },
  { href: "/about", icon: "✍️", label: "关于作者", note: "版权与联系" },
];

export default function MePage() {
  const [stats, setStats] = useState({ practiced: 0, accuracy: 0, wrong: 0 });

  useEffect(() => {
    const read = () => {
    try {
      const rec = JSON.parse(localStorage.getItem("practiceRecords") || "[]");
      const wrong = JSON.parse(localStorage.getItem("wrongStats") || "[]");
      const total = rec.length;
      const correct = rec.filter((r: { correct?: boolean }) => r.correct).length;
      setStats({
        practiced: total,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
        wrong: Array.isArray(wrong) ? wrong.length : 0,
      });
    } catch {
      /* 忽略 */
    }
    };
    read();
    return onSoftRefresh(read);
  }, []);

  return (
    <div className="xc-fade">
      <div className="pt-3">
        <div className="xc-title">我的</div>
        <div className="xc-sub">本地数据，离线可用</div>
      </div>

      <div
        className="relative mt-4 overflow-hidden rounded-3xl p-5 text-white"
        style={{ background: "var(--grad)", boxShadow: "var(--shadow-lg)" }}
      >
        <div
          className="absolute -right-8 -bottom-12 h-36 w-36 rounded-full"
          style={{ background: "rgba(255,255,255,.14)" }}
        />
        <div className="relative">
          <div
            className="flex items-center justify-center rounded-2xl text-2xl"
            style={{ width: 52, height: 52, background: "rgba(255,255,255,.22)" }}
          >
            🎓
          </div>
          <h3 className="mt-2.5 text-[17px] font-extrabold">行测题库 · 学习档案</h3>
          <p className="mt-0.5 text-xs opacity-90">你的每一次坚持，成就你更好的人生</p>
        </div>
      </div>

      <div className="mt-3.5 space-y-2.5">
        {ROWS.map((r) => (
          <Link key={r.href} href={r.href} className="xc-card-sm flex items-center gap-3">
            <span className="xc-icon-box">{r.icon}</span>
            <span className="text-sm font-semibold">{r.label}</span>
            <span className="ml-auto text-xs font-semibold text-[var(--fg-muted)]">{r.note} ›</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-1 text-center text-[11px] text-[var(--fg-muted)]">
        <div>题库：2022—2026 · 22,298 题 · 完全离线</div>
        <div className="font-semibold">© 2026 xiaogaostu · 保留所有权利</div>
      </div>
    </div>
  );
}
