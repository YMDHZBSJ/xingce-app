/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 * 本文件为原创代码，未经许可禁止复制、修改、分发或商用。
 */

/** 统一的模块与题型字典，供 SearchBar、practice、wrong 等页面复用 */

export const MODULES = [
  { value: "", label: "全部模块" },
  { value: "政治理论", label: "政治理论" },
  { value: "常识判断", label: "常识判断" },
  { value: "言语理解与表达", label: "言语理解与表达" },
  { value: "数量关系", label: "数量关系" },
  { value: "判断推理", label: "判断推理" },
  { value: "资料分析", label: "资料分析" },
] as const;

export const QTYPE_BY_MODULE: Record<string, string[]> = {
  政治理论: ["新思想", "马克思主义", "毛中特"],
  常识判断: [
    "人文常识",
    "科技常识",
    "法律常识",
    "经济常识",
    "地理国识",
    "时事政治",
  ],
  言语理解与表达: ["片段阅读", "逻辑填空", "语句表达"],
  数量关系: ["数学运算"],
  判断推理: ["图形推理", "类比推理", "定义判断", "逻辑判断"],
  资料分析: ["增长", "比重", "平均数", "综合", "倍数"],
};

export const ALL_QTYPES = Object.values(QTYPE_BY_MODULE).flat();
