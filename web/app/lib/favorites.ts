"use client";

/** 全局收藏题目：所有出现题目的地方都能收藏，我的-收藏题目查看 */
export interface FavoriteItem {
  id: number;
  at: number;
  module?: string;
  qtype?: string;
  stem?: string;
}

const KEY = "favoriteQuestions";

export function loadFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => x && typeof x.id === "number") : [];
  } catch { return []; }
}

function write(list: FavoriteItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("xc-favorites", { detail: list.length }));
  } catch { /* 忽略 */ }
}

export function isFavorite(id: number): boolean {
  return loadFavorites().some((f) => f.id === id);
}

export function toggleFavorite(q: { id: number; module?: string | null; qtype?: string | null; stem?: string | null }): boolean {
  const list = loadFavorites();
  const idx = list.findIndex((f) => f.id === q.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    write(list);
    return false;
  }
  list.unshift({
    id: q.id,
    at: Date.now(),
    module: q.module || "",
    qtype: q.qtype || "",
    stem: (q.stem || "").replace(/<[^>]+>/g, "").slice(0, 120),
  });
  write(list);
  return true;
}

export function removeFavorite(id: number): void {
  write(loadFavorites().filter((f) => f.id !== id));
}

export function onFavoritesChange(cb: (n: number) => void): () => void {
  const h = (e: Event) => cb(Number((e as CustomEvent).detail) || 0);
  window.addEventListener("xc-favorites", h);
  return () => window.removeEventListener("xc-favorites", h);
}
