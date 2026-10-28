"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { Suspense, useEffect, useState, useCallback } from "react";
import { onSoftRefresh } from "../lib/soft-refresh";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchBar from "../components/SearchBar";
import QuestionCard, { type Question } from "../components/QuestionCard";

interface SearchResult {
  items: Question[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-[var(--fg-muted)]">加载中...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(2);

  const query = searchParams.get("q") || "";
  const module = searchParams.get("module") || "";
  const qtype = searchParams.get("qtype") || "";

  const hasCriteria = !!(query || module || qtype);

  useEffect(() => { setVisibleCount(2); }, [query, module, qtype]);

  const fetchResults = useCallback(
    async (page: number) => {
      if (!query && !module && !qtype) {
        setResults(null);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (module) params.set("module", module);
        if (qtype) params.set("qtype", qtype);
        params.set("page", String(page));
        params.set("pageSize", "20");

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) {
          let detail = `服务返回 ${res.status}`;
          try {
            const j = await res.json();
            if (j?.error) detail = j.error;
          } catch {
            /* ignore */
          }
          throw new Error(`搜索失败（${detail}）`);
        }
        const data = await res.json();
        setResults({
          items: data.items || [],
          pagination: data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "搜索失败");
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [query, module, qtype]
  );

  // 下拉刷新：重新执行当前搜索
  useEffect(() => onSoftRefresh(() => { fetchResults(currentPage); }), [fetchResults, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchResults(1);
  }, [fetchResults]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchResults(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <h1 className="xc-title">题库搜索</h1>

      <SearchBar initialQuery={query} initialModule={module} initialQtype={qtype} />

      {/* Active filters display */}
      {(query || module || qtype) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-[var(--fg-muted)]">当前筛选：</span>
          {query && (
            <span className="px-2 py-0.5 rounded bg-[var(--chip)] text-[var(--chip-fg)]">
              关键词: {query}
            </span>
          )}
          {module && (
            <span className="px-2 py-0.5 rounded bg-[var(--chip)] text-[var(--chip-fg)]">
              模块: {module}
            </span>
          )}
          {qtype && (
            <span className="px-2 py-0.5 rounded bg-[var(--chip)] text-[var(--chip-fg)]">
              题型: {qtype}
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-[var(--chip)] rounded w-1/4 mb-3" />
              <div className="h-4 bg-[var(--chip)] rounded w-full mb-2" />
              <div className="h-4 bg-[var(--chip)] rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {!loading && !hasCriteria && (
        <div className="card p-8 text-center space-y-2">
          <p className="text-[var(--fg)] font-medium">输入关键词开始搜索</p>
          <p className="text-sm text-[var(--fg-muted)]">
            也可以只选模块或题型，直接浏览该范围内的真题。
          </p>
          <p className="text-xs text-[var(--fg-muted)]">
            例：基期量、逻辑填空、图形推理、行政许可
          </p>
        </div>
      )}

      {error && (
        <div className="card p-4 border-[var(--accent)]">
          <p className="text-sm text-[var(--accent-text)]">{error}</p>
          <p className="text-sm text-[var(--fg-muted)] mt-2">
            请确认API服务已启动，或尝试其他搜索条件。
          </p>
        </div>
      )}

      {!loading && !error && hasCriteria && results && (
        <>
          <div className="text-sm text-[var(--fg-muted)]">
            共找到 <span className="text-[var(--accent-text)] font-bold">{results.pagination.total}</span> 道题目，
            第 {results.pagination.page}/{results.pagination.totalPages} 页
          </div>

          {results.items.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-[var(--fg-muted)]">未找到匹配的题目</p>
              <p className="text-sm text-[var(--fg-muted)] mt-2">尝试更换关键词或筛选条件</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.items.slice(0, visibleCount).map((q) => (
                <Link key={q.id} href={`/question/?id=${q.id}`}>
                  <QuestionCard question={q} compact showAnswer={false} />
                </Link>
              ))}
            </div>
          )}

          {/* 加载更多：默认只显示 2 条，避免一次性堆满 */}
          {results.items.length > visibleCount && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setVisibleCount((n) => n + 10)}
                className="xc-btn-ghost w-full"
              >
                加载更多（还有 {results.items.length - visibleCount} 条）
              </button>
            </div>
          )}
          {results.items.length <= visibleCount && results.items.length > 2 && (
            <p className="mt-4 text-center text-[11px] text-[var(--fg-muted)]">已显示全部结果</p>
          )}
        </>
      )}
    </div>
  );
}