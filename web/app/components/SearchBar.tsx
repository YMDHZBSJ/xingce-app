"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useRouter } from "next/navigation";
import InlinePicker from "./InlinePicker";
import { useState } from "react";
import { MODULES, ALL_QTYPES } from "../lib/consts";

interface SearchBarProps {
  initialQuery?: string;
  initialModule?: string;
  initialQtype?: string;
  onSearch?: (params: { q: string; module: string; qtype: string }) => void;
}

export default function SearchBar({
  initialQuery = "",
  initialModule = "",
  initialQtype = "",
  onSearch,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [module, setModule] = useState(initialModule);
  const [qtype, setQtype] = useState(initialQtype);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (module) params.set("module", module);
    if (qtype) params.set("qtype", qtype);

    if (onSearch) {
      onSearch({ q: query.trim(), module, qtype });
    } else {
      router.push(`/search?${params.toString()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-3">
        {/* Search input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词搜索题目..."
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--accent)] transition-smooth"
            />
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[var(--accent-fill)] text-white font-medium hover:opacity-80 transition-smooth whitespace-nowrap"
          >
            搜索
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <InlinePicker
            value={module}
            ariaLabel="选择模块"
            placeholder="全部模块"
            options={MODULES.map((m) => ({ value: m.value, label: m.label }))}
            onChange={setModule}
            columns={2}
          />
          <InlinePicker
            value={qtype}
            ariaLabel="选择题型"
            placeholder="全部题型"
            options={[{ value: "", label: "全部题型" }, ...ALL_QTYPES.map((q) => ({ value: q, label: q }))]}
            onChange={setQtype}
            columns={2}
          />
        </div>
      </div>
    </form>
  );
}