/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */

/** 六大模块的图标与配色（视觉识别用） */
export const MODULE_STYLE: Record<string, { icon: string; color: string }> = {
  判断推理: { icon: "🧩", color: "#F4701E" },
  言语理解与表达: { icon: "📖", color: "#E94560" },
  资料分析: { icon: "📊", color: "#F59E0B" },
  常识判断: { icon: "💡", color: "#8B5CF6" },
  数量关系: { icon: "🔢", color: "#10B981" },
  政治理论: { icon: "🏛️", color: "#6366F1" },
};

export function moduleStyle(name?: string) {
  return (name && MODULE_STYLE[name]) || { icon: "📘", color: "#8B8177" };
}
