/**
 * 行测题库 · 作者 xiaogaostu
 * © 2026 xiaogaostu. All Rights Reserved.
 *
 * 节奏诊断：基于每题用时与对错，找出耗时黑洞、秒答陷阱，给出节奏结论
 */
export interface RhythmItem {
  id: number;
  sec: number;
  correct?: boolean;
  label?: string;
}

export interface RhythmResult {
  avg: number;
  buckets: { label: string; count: number }[];
  blackHoles: RhythmItem[];   // 用时过长
  quickWrong: RhythmItem[];   // 秒答且错（蒙的）
  totalSec: number;
  conclusion: string;
}

export function diagnose(items: RhythmItem[]): RhythmResult {
  const valid = items.filter((x) => Number.isFinite(x.sec) && x.sec >= 0);
  const totalSec = valid.reduce((a, b) => a + b.sec, 0);
  const avg = valid.length ? Math.round(totalSec / valid.length) : 0;

  const ranges = [
    { label: "<30s", min: 0, max: 30 },
    { label: "30-60s", min: 30, max: 60 },
    { label: "60-90s", min: 60, max: 90 },
    { label: "90-150s", min: 90, max: 150 },
    { label: "150s+", min: 150, max: Infinity },
  ];
  const buckets = ranges.map((r) => ({
    label: r.label,
    count: valid.filter((x) => x.sec >= r.min && x.sec < r.max).length,
  }));

  const blackHoles = valid.filter((x) => x.sec >= 120).sort((a, b) => b.sec - a.sec).slice(0, 3);
  const quickWrong = valid.filter((x) => x.sec < 15 && x.correct === false).slice(0, 3);

  const slow = valid.filter((x) => x.sec > 120).length;
  const fast = valid.filter((x) => x.sec < 30).length;

  let conclusion = "整体节奏平稳，继续保持。";
  if (valid.length >= 3) {
    if (slow >= Math.max(2, valid.length * 0.2)) {
      conclusion = `有 ${slow} 题耗时超过 2 分钟，考试时这类题建议先标记跳过，最后再回来看。`;
    } else if (quickWrong.length >= 2) {
      conclusion = `存在 ${quickWrong.length} 道「秒答但做错」，属于蒙题陷阱：没思路时不要急着选，先排除两个选项再蒙。`;
    } else if (fast >= valid.length * 0.6 && avg < 40) {
      conclusion = "你做得偏快，注意正确率是否被速度牺牲，建议放慢 10 秒读题。";
    } else if (avg > 100) {
      conclusion = "平均用时偏长，行测是限时赛，先练「该跳就跳」。";
    }
  }

  return { avg, buckets, blackHoles, quickWrong, totalSec, conclusion };
}
