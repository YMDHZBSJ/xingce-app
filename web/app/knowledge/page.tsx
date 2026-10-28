"use client";

/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */
import { useEffect, useState, useCallback } from "react";
import { onSoftRefresh } from "../lib/soft-refresh";
import BrandLoader from "../components/BrandLoader";
import QuestionCard, { type Question } from "../components/QuestionCard";
import Icon from "../components/Icon";

interface KnowledgePoint {
  id: number;
  name: string;
  module: string;
  description: string | null;
  parent_id: number | null;
  related_ids: number[];
  relation_types: string[];
  questions: Question[];
}

interface KPTree {
  id: number;
  name: string;
  module: string;
  children: KPTree[];
}

const moduleList = [
  "政治理论",
  "常识判断",
  "言语理解与表达",
  "数量关系",
  "判断推理",
  "资料分析",
];

export default function KnowledgePage() {
  const [tree, setTree] = useState<KPTree[]>([]);
  const [selectedKP, setSelectedKP] = useState<KnowledgePoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [allKPs, setAllKPs] = useState<Map<number, KnowledgePoint>>(new Map());
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  // Fetch knowledge point tree
  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kp");
      if (!res.ok) throw new Error("考点数据加载失败");
      const data = await res.json();

      // API 返回 { items: 树形根节点[], total, filters }
      const roots: any[] = Array.isArray(data) ? data : data.items || [];

      // 扁平化整棵树，供关联考点名称查找
      const flat: KnowledgePoint[] = [];
      const walk = (nodes: any[]) => {
        for (const n of nodes) {
          flat.push({
            id: n.id,
            name: n.name,
            module: n.module,
            description: n.description ?? null,
            parent_id: n.parent_id ?? null,
            related_ids: n.related_ids || [],
            relation_types: n.relation_types || [],
            questions: [],
          });
          if (n.children && n.children.length) walk(n.children);
        }
      };
      walk(roots);

      const kpMap = new Map<number, KnowledgePoint>();
      flat.forEach((kp) => kpMap.set(kp.id, kp));
      setAllKPs(kpMap);

      // 树形结构按模块分组（根节点本身就是模块）
      const moduleOrder = [
        "政治理论",
        "常识判断",
        "言语理解与表达",
        "数量关系",
        "判断推理",
        "资料分析",
      ];
      const sorted = [...roots].sort((a, b) => {
        const ai = moduleOrder.indexOf(a.module);
        const bi = moduleOrder.indexOf(b.module);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });

      setTree(
        sorted.map((m) => ({
          id: m.id,
          name: m.name,
          module: m.module,
          children: (m.children || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            module: c.module,
            children: (c.children || []).map((g: any) => ({
              id: g.id,
              name: g.name,
              module: g.module,
              children: [],
            })),
          })),
        }))
      );

      // 默认选中并展开第一个模块
      if (sorted.length > 0) {
        setExpandedModules(new Set([sorted[0].module]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "考点数据加载失败");
      setTree([]);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => onSoftRefresh(fetchTree), [fetchTree]);
  // Fetch a specific knowledge point detail
  const fetchKPDetail = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/kp/${id}`);
      if (!res.ok) throw new Error("考点详情加载失败");
      const data = await res.json();

      // Build related_ids and relation_types from relatedKps
      const outgoing = data.relatedKps?.outgoing || [];
      const incoming = data.relatedKps?.incoming || [];
      const allRelated = [...outgoing, ...incoming];
      const related_ids = allRelated.map((r: any) => r.id);
      const relation_types = allRelated.map((r: any) => r.relation_type);

      setSelectedKP({
        ...data,
        related_ids,
        relation_types,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "考点详情加载失败");
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // 支持 /knowledge?kp=12 直接打开某个考点（便于从分析页/收藏页深链）
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("kp")) || 0;
    if (id > 0) fetchKPDetail(id);
  }, [fetchKPDetail]);

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  const handleNodeClick = (id: number) => {
    fetchKPDetail(id);
  };

  const handleAnswerSelect = (questionId: number, label: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: label }));
    setRevealed((prev) => ({ ...prev, [questionId]: true }));
  };

  return (
    <div className="space-y-4">
      <h1 className="xc-title">考点图谱</h1>

      {error && (
        <div className="card p-4 border-[var(--accent-text)]">
          <p className="text-sm text-[var(--accent-text)]">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 左侧：考点树导航 */}
        <div className="lg:col-span-3">
          <div className="card p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            <h2 className="text-sm font-semibold text-[var(--fg-muted)] mb-3">考点导航</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-[var(--chip)] rounded animate-pulse" />
                ))}
              </div>
            ) : tree.length === 0 ? (
              <p className="text-sm text-[var(--fg-muted)]">暂无考点数据</p>
            ) : (
              <div className="space-y-1">
                {tree.map((moduleNode) => (
                  <div key={moduleNode.module}>
                    <button
                      onClick={() => toggleModule(moduleNode.module)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium text-[var(--fg)] hover:bg-[var(--chip)] transition-smooth"
                    >
                      <span className="text-[var(--accent-text)]">
                        <Icon
                          name={expandedModules.has(moduleNode.module) ? "chevron-down" : "chevron-right"}
                          size={14}
                        />
                      </span>
                      {moduleNode.module}
                      <span className="text-xs text-[var(--fg-muted)] ml-auto">
                        ({moduleNode.children.length})
                      </span>
                    </button>
                    {expandedModules.has(moduleNode.module) && (
                      <div className="ml-4 space-y-1">
                        {moduleNode.children.map((child) => (
                          <KPTreeItem
                            key={child.id}
                            node={child}
                            selectedId={selectedKP?.id}
                            onSelect={handleNodeClick}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：选中考点详情 */}
        <div className="lg:col-span-9">
          <div className="card p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {!selectedKP ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <p className="text-[var(--fg-muted)]">请从左侧选择一个考点</p>
                <p className="text-sm text-[var(--fg-muted)] mt-2">
                  点击左侧考点名称，查看该考点下的真题
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 考点头部 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-[var(--chip)] text-[var(--chip-fg)] text-xs">
                    {selectedKP.module}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[var(--fg)] mb-2">
                  {selectedKP.name}
                </h2>
                {selectedKP.description && (
                  <p className="text-sm text-[var(--fg-muted)] mb-3">
                    {selectedKP.description}
                  </p>
                )}

                {/* 关联考点 */}
                {selectedKP.related_ids && selectedKP.related_ids.length > 0 && (
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-[var(--fg-muted)] mb-2">
                      关联考点
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedKP.related_ids.map((rid, idx) => {
                        const related = allKPs.get(rid);
                        if (!related) return null;
                        return (
                          <button
                            key={rid}
                            onClick={() => handleNodeClick(rid)}
                            className="px-2 py-1 rounded bg-[var(--chip)] text-[var(--fg-muted)] text-xs hover:bg-[var(--chip-border)] hover:text-[var(--fg)] transition-smooth"
                          >
                            {related.name}
                            <span className="text-[var(--accent-text)] text-[10px]">
                              {selectedKP.relation_types?.[idx] || "关联"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 该考点下的题目 */}
                {selectedKP.questions && selectedKP.questions.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-[var(--fg-muted)] mb-2">
                      该考点相关真题（{selectedKP.questions.length}）
                    </h3>
                    {/* 按年份分组 → 考点时间线 */}
                    {(() => {
                      const groups = new Map<string, typeof selectedKP.questions>();
                      [...selectedKP.questions]
                        .sort((a, b) => String(b.year || "").localeCompare(String(a.year || "")))
                        .forEach((q) => {
                          const y = String(q.year || "未知年份");
                          if (!groups.has(y)) groups.set(y, []);
                          groups.get(y)!.push(q);
                        });
                      return [...groups.entries()].slice(0, 3).map(([year, list], gi) => (
                        <div key={year} className="relative mb-4 pl-5">
                          {/* 时间轴线与圆点 */}
                          <span
                            className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full"
                            style={{ background: gi === 0 ? "var(--grad)" : "var(--line)" }}
                          />
                          {gi < groups.size - 1 && (
                            <span className="absolute left-[4.5px] top-4 bottom-0 w-px bg-[var(--line)]" />
                          )}
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-[13px] font-extrabold text-[var(--fg)]">{year} 年</span>
                            <span className="xc-badge">{list.length} 题</span>
                          </div>
                          <div className="space-y-2">
                            {list.slice(0, 5).map((q) => (
                              <QuestionCard
                                key={q.id}
                                question={q}
                                compact
                                showAnswer={false}
                                onAnswerSelect={handleAnswerSelect}
                                selectedAnswer={answers[q.id] || undefined}
                                isCorrect={
                                  answers[q.id] && q.answer
                                    ? answers[q.id] === (q.answer ?? "").trim()
                                    : null
                                }
                              />
                            ))}
                            {list.length > 5 && (
                              <p className="pt-1 text-center text-[11px] text-[var(--fg-muted)]">
                                该年另有 {list.length - 5} 道，可到「题库搜索」按年份筛选查看
                              </p>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--fg-muted)] text-center py-4">
                    暂无该考点下的真题
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Recursive tree item component
function KPTreeItem({
  node,
  selectedId,
  onSelect,
}: {
  node: KPTree;
  selectedId?: number;
  onSelect: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div className="flex items-center gap-1">
        {node.children.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[var(--accent-text)] w-4"
          >
            <Icon name={expanded ? "chevron-down" : "chevron-right"} size={14} />
          </button>
        )}
        <button
          onClick={() => onSelect(node.id)}
          className={`flex-1 text-left px-2 py-1 rounded text-sm transition-smooth ${isSelected ? "bg-[var(--chip)] text-[var(--chip-fg)] font-medium" : "text-[var(--fg)] hover:bg-[var(--chip)]"}`}
        >
          {node.name}
        </button>
      </div>
      {expanded && node.children.length > 0 && (
        <div className="ml-4 space-y-1">
          {node.children.map((child) => (
            <KPTreeItem
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}