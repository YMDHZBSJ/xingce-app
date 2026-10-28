"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import Link from "next/link";
import { onSoftRefresh } from "../lib/soft-refresh";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadWrongEntries,
  removeWrong,
  clearWrong,
  type WrongEntry,
} from "../lib/wrong-store";
import type { Question } from "../components/QuestionCard";
import WrongDrill from "../components/WrongDrill";
import Icon from "../components/Icon";

type Phase = "categories" | "list" | "drill";

interface Row extends WrongEntry {
  module: string;
  qtype: string;
  stem: string;
  /** 资料分析等题型的给定材料（摘要） */
  materialExcerpt: string;
  hasMaterial: boolean;
}

function plain(html: string | null, max = 110): string {
  if (!html) return "";
  const t = html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export default function WrongPage() {
  const [phase, setPhase] = useState<Phase>("categories");
  const [entries, setEntries] = useState<WrongEntry[]>([]);
  const [details, setDetails] = useState<Map<number, Question>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [drillId, setDrillId] = useState<number | null>(null);
  const [clearAsk, setClearAsk] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = loadWrongEntries();
      setEntries(list);
      if (list.length === 0) {
        setDetails(new Map());
        return;
      }
      const ids = list.map((e) => e.id);
      const map = new Map<number, Question>();
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const res = await fetch(`/api/questions/batch?ids=${chunk.join(",")}`);
        if (!res.ok) throw new Error("错题详情加载失败");
        const data = await res.json();
        for (const q of data.items as Question[]) map.set(q.id, q);
      }
      setDetails(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => onSoftRefresh(loadAll), [loadAll]);
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const rows: Row[] = useMemo(
    () =>
      entries
        .map((e) => {
          const q = details.get(e.id);
          return {
            ...e,
            module: q?.module || "未分类",
            qtype: q?.qtype || "",
            stem: plain(q?.stem ?? ""),
            materialExcerpt: plain(q?.material_content || q?.material || "", 80),
            hasMaterial: !!(q?.material_content || q?.material),
          };
        })
        .filter((r) => details.has(r.id)),
    [entries, details]
  );

  // 分类：组间按错题数量降序，组内按错误次数降序
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      if (!map.has(r.module)) map.set(r.module, []);
      map.get(r.module)!.push(r);
    }
    return [...map.entries()]
      .map(([module, items]) => ({
        module,
        items: [...items].sort((a, b) => b.count - a.count || a.id - b.id),
        totalErrors: items.reduce((s, x) => s + x.count, 0),
      }))
      .sort(
        (a, b) =>
          b.items.length - a.items.length || b.totalErrors - a.totalErrors
      );
  }, [rows]);

  const activeGroup = groups.find((g) => g.module === activeModule) ?? null;
  const drillQuestion = drillId != null ? details.get(drillId) ?? null : null;
  const drillEntry = entries.find((e) => e.id === drillId) ?? null;
  /** 重做顺序 = 当前分类下的错题顺序（支持上一题/下一题） */
  const drillList = activeGroup?.items ?? [];
  const drillIndex = drillId != null ? drillList.findIndex((r) => r.id === drillId) : -1;

  const totalQuestions = rows.length;
  const totalErrors = rows.reduce((s, r) => s + r.count, 0);

  // ───── 重做 ─────
  if (phase === "drill" && drillQuestion && drillEntry) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-[var(--fg)]">错题重做</h1>
        <WrongDrill
          key={drillQuestion.id}
          question={drillQuestion}
          initialWrongCount={drillEntry.count}
          index={drillIndex >= 0 ? drillIndex : undefined}
          total={drillList.length || undefined}
          onPrev={
            drillIndex > 0
              ? () => setDrillId(drillList[drillIndex - 1].id)
              : undefined
          }
          onNext={
            drillIndex >= 0 && drillIndex < drillList.length - 1
              ? () => setDrillId(drillList[drillIndex + 1].id)
              : undefined
          }
          onExit={() => {
            setPhase("list");
            setDrillId(null);
          }}
          onCorrect={() => {
            /* 答对即完成本次重做 */
          }}
          onCountChange={(n) => {
            setEntries((prev) =>
              prev.map((e) =>
                e.id === drillQuestion.id ? { ...e, count: n } : e
              )
            );
          }}
          onRemove={() => {
            removeWrong(drillQuestion.id);
            setEntries((prev) => prev.filter((e) => e.id !== drillQuestion.id));
            setPhase("list");
            setDrillId(null);
          }}
        />
      </div>
    );
  }

  // ───── 某个分类下的错题列表 ─────
  if (phase === "list" && activeGroup) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setPhase("categories");
              setActiveModule(null);
            }}
            className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] inline-flex items-center gap-1.5"
          >
            <Icon name="arrow-left" size={15} />
            全部分类
          </button>
          <span className="text-xs text-[var(--fg-muted)] tabular-nums">
            {activeGroup.items.length} 题 · 累计错 {activeGroup.totalErrors} 次
          </span>
        </div>

        <h1 className="text-xl font-bold text-[var(--fg)]">{activeGroup.module}</h1>

        <ul className="space-y-3">
          {activeGroup.items.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                <span className="px-2 py-0.5 rounded bg-[var(--chip)] text-[var(--chip-fg)]">
                  {r.qtype || "未知题型"}
                </span>
                <span className="px-2 py-0.5 rounded bg-[var(--bad-bg)] text-[var(--accent-text)] tabular-nums">
                  错 {r.count} 次
                </span>
                {r.count >= 2 && (
                  <span className="rounded bg-[var(--accent-fill)] px-2 py-0.5 text-[11px] font-bold text-white">
                    顽固
                  </span>
                )}
                {r.hasMaterial && (
                  <span className="px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--line)] text-[var(--fg-muted)]">
                    含材料
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--fg)] leading-snug mb-2">{r.stem}</p>
              {r.hasMaterial && (
                <p className="text-xs text-[var(--fg-muted)] leading-relaxed mb-3 border-l-2 border-[var(--line)] pl-2">
                  材料：{r.materialExcerpt || "（材料以图片形式给出，点重做查看）"}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setDrillId(r.id);
                    setPhase("drill");
                  }}
                  className="px-4 py-2 rounded-lg bg-[var(--accent-fill)] text-white text-sm font-medium hover:opacity-90 transition-smooth"
                >
                  重做这道题
                </button>
                <button
                  onClick={() => {
                    removeWrong(r.id);
                    setEntries((prev) => prev.filter((e) => e.id !== r.id));
                  }}
                  className="px-3 py-2 rounded-lg border border-[var(--line)] text-sm text-[var(--fg-muted)] hover:border-[var(--accent)] transition-smooth"
                >
                  移出错题本
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ───── 分类总览（默认：只展示分类，不展示题目） ─────
  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={clearAsk}
        danger
        title="清空全部错题？"
        desc={`将删除 ${totalQuestions} 道错题记录，此操作不可撤销`}
        confirmText="确认清空"
        cancelText="再想想"
        onConfirm={() => {
          clearWrong();
          setEntries([]);
          setDetails(new Map());
          setClearAsk(false);
        }}
        onCancel={() => setClearAsk(false)}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--fg)]">错题本</h1>
        {totalQuestions > 0 && (
          <button
            onClick={() => setClearAsk(true)}
            className="flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-bold"
            style={{
              borderColor: "rgba(220,38,38,.35)",
              background: "rgba(253,236,236,.85)",
              color: "#DC2626",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
            清空全部
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-[var(--fg-muted)] mb-1">错题分类</div>
          <div className="text-2xl font-bold text-[var(--accent-text)] tabular-nums">
            {groups.length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-[var(--fg-muted)] mb-1">错题道数</div>
          <div className="text-2xl font-bold text-[var(--fg)] tabular-nums">
            {totalQuestions}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-[var(--fg-muted)] mb-1">累计错误</div>
          <div className="text-2xl font-bold text-[var(--fg)] tabular-nums">
            {totalErrors}
          </div>
        </div>
      </div>

      {loading && (
        <div className="card p-6 animate-pulse">
          <div className="h-5 w-1/3 rounded bg-[var(--chip)] mb-3" />
          <div className="h-4 w-2/3 rounded bg-[var(--chip)]" />
        </div>
      )}

      {error && (
        <div className="card p-4 border-[var(--accent)]" role="alert">
          <p className="text-sm text-[var(--accent-text)]">{error}</p>
        </div>
      )}

      {!loading && !error && totalQuestions === 0 && (
        <div className="card">
          <EmptyState
            title="错题本还是空的"
            desc="在「题型专练」或「模拟考试」里答错的题会自动记到这里，并按模块分类"
            action={<Link href="/practice" className="xc-btn" style={{ padding: "0 22px" }}>去练几题</Link>}
          />
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-[var(--fg)] mb-3">
            错题分类（按错题数量从多到少）
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((g, idx) => (
              <li key={g.module}>
                <button
                  onClick={() => {
                    setActiveModule(g.module);
                    setPhase("list");
                  }}
                  className="xc-press w-full card p-4 text-left"
                  style={{ border: "1px solid rgba(244,112,30,.16)", WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-md bg-[var(--chip)] text-[var(--chip-fg)] text-xs flex items-center justify-center tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-[14.5px] font-bold text-[var(--fg)]">
                      {g.module}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--accent-text)] tabular-nums">{g.items.length} 题</span>
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                        style={{ background: "var(--grad)", boxShadow: "0 6px 12px -6px rgba(233,69,96,.8)" }}
                      >
                        <Icon name="chevron-right" size={15} />
                      </span>
                    </span>
                  </div>
                  <div className="text-xs text-[var(--fg-muted)] tabular-nums">
                    累计错误 {g.totalErrors} 次 · 错最多的一题错{" "}
                    {g.items[0]?.count ?? 0} 次
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
