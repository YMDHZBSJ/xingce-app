"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Icon, { type IconName } from "./Icon";
import { onImmersiveChange } from "../lib/immersive";

type Tab = { href: string; label: string; icon: IconName; color: string; match: (p: string) => boolean };

const TABS: Tab[] = [
  { href: "/", label: "首页", icon: "book", color: "#F4701E", match: (p) => p === "/" },
  { href: "/practice", label: "专练", icon: "pencil", color: "#E94560", match: (p) => p.startsWith("/practice") },
  { href: "/exam", label: "模考", icon: "clipboard", color: "#8B5CF6", match: (p) => p.startsWith("/exam") },
  { href: "/wrong", label: "错题", icon: "alert", color: "#F59E0B", match: (p) => p.startsWith("/wrong") },
  { href: "/me", label: "我的", icon: "chart", color: "#10B981", match: (p) => p.startsWith("/me") || p.startsWith("/analyze") || p.startsWith("/about") || p.startsWith("/stats") || p.startsWith("/knowledge") },
];

export default function TabBar() {
  const router = useRouter();
  const raw = usePathname() || "/";
  const pathname = raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
  const [typing, setTyping] = useState(false);
  const [immersive, setImmersive] = useState(false);
  // -1 表示当前页面不属于任何 Tab（例如搜索页），此时不显示选中态
  const activeIndex = useMemo(() => TABS.findIndex((t) => t.match(pathname)), [pathname]);

  useEffect(() => {
    const sync = () => setImmersive(document.body.dataset.immersive === "1");
    sync();
    const off = onImmersiveChange(setImmersive);
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ["data-immersive"] });
    return () => { off(); mo.disconnect(); };
  }, []);

  useEffect(() => { setTyping(false); }, [pathname]);

  useEffect(() => {
    const isField = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t || !t.tagName) return false;
      return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable === true;
    };
    const onFocusIn = (e: FocusEvent) => { if (isField(e.target)) setTyping(true); };
    const onFocusOut = () => setTyping(false);
    const vv = window.visualViewport;
    const onViewport = () => {
      if (!vv) return;
      const hidden = window.innerHeight - vv.height > 120;
      if (hidden) setTyping(true);
      else if (!isField(document.activeElement)) setTyping(false);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    vv?.addEventListener("resize", onViewport);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      vv?.removeEventListener("resize", onViewport);
    };
  }, []);

  return (
    <nav
      className="xc-tabbar"
      style={{
        display: typing || immersive ? "none" : undefined,
        transform: typing || immersive ? "translateY(140%)" : "none",
        opacity: typing || immersive ? 0 : 1,
        transition: "transform .2s ease, opacity .2s ease",
        pointerEvents: typing || immersive ? "none" : "auto",
      }}
    >
      <div className="xc-tabwrap">
        {activeIndex >= 0 && (
          <div className="xc-tab-pill" style={{ width: `${100 / TABS.length}%`, transform: `translateX(${activeIndex * 100}%)` }} />
        )}
        {TABS.map((t) => {
          const on = activeIndex >= 0 && TABS[activeIndex].href === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              replace
              onClick={(e) => { e.preventDefault(); router.replace(t.href); }}
              className="xc-tab"
              style={{ position: "relative", zIndex: 1 }}
            >
              <span
                style={{
                  display: "flex",
                  color: on ? "#fff" : t.color,
                  opacity: on ? 1 : 0.9,
                  transition: "color .18s ease, transform .18s ease",
                  transform: on ? "translateY(-1px) scale(1.06)" : "none",
                }}
              >
                <Icon name={t.icon} size={21} />
              </span>
              <span style={{ fontWeight: on ? 800 : 600 }}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
