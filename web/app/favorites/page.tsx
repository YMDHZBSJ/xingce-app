"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "../components/EmptyState";
import { loadFavorites, removeFavorite, type FavoriteItem } from "../lib/favorites";
import { onSoftRefresh } from "../lib/soft-refresh";

export default function FavoritesPage() {
  const [list, setList] = useState<FavoriteItem[]>([]);

  const load = useCallback(() => setList(loadFavorites()), []);
  useEffect(() => {
    load();
    return onSoftRefresh(load);
  }, [load]);

  return (
    <div className="xc-fade pb-4">
      <div className="pt-3">
        <div className="xc-title">收藏题目</div>
        <div className="xc-sub">共 {list.length} 道 · 点击查看详情</div>
      </div>

      {list.length === 0 ? (
        <div className="xc-card mt-3">
          <EmptyState
            title="还没有收藏题目"
            desc="在做题页面点右上角「☆ 收藏」，题目就会收进这里，方便以后回看"
            action={<Link href="/practice" className="xc-btn" style={{ padding: "0 22px" }}>去做题</Link>}
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {list.map((f) => (
            <li key={f.id}>
              <Link href={`/question/?id=${f.id}`} className="xc-card-sm xc-press block">
                <div className="flex items-center gap-2">
                  <span className="xc-icon-box" style={{ width: 30, height: 30, fontSize: 14 }}>⭐</span>
                  <span className="text-[11px] font-bold text-[var(--accent-text)]">{f.module || "题目"}</span>
                  {f.qtype && <span className="text-[10.5px] text-[var(--fg-muted)]">· {f.qtype}</span>}
                  <span className="ml-auto text-[10.5px] text-[var(--fg-muted)]">
                    {new Date(f.at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--fg-2)]">
                  {(f.stem || "").slice(0, 90)}…
                </p>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeFavorite(f.id); setList(loadFavorites()); }}
                    className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--fg-muted)]"
                  >
                    取消收藏
                  </button>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
