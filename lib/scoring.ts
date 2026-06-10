// Rollup helpers for per-metric 1-5 scoring weighted by category.

export type ScoredMetric = {
  categoryName: string;
  categoryWeight: number;
  selfScore?: number | null;
  managerScore?: number | null;
};

export type CategoryRollup = {
  name: string;
  weight: number;
  selfAvg: number | null; // 1-5
  managerAvg: number | null; // 1-5
  count: number;
};

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function rollupByCategory(metrics: ScoredMetric[]): CategoryRollup[] {
  const map = new Map<string, { weight: number; self: number[]; mgr: number[]; count: number }>();
  for (const m of metrics) {
    const e = map.get(m.categoryName) ?? { weight: m.categoryWeight, self: [], mgr: [], count: 0 };
    e.count++;
    if (typeof m.selfScore === "number") e.self.push(m.selfScore);
    if (typeof m.managerScore === "number") e.mgr.push(m.managerScore);
    map.set(m.categoryName, e);
  }
  return Array.from(map.entries()).map(([name, e]) => ({
    name,
    weight: e.weight,
    selfAvg: avg(e.self),
    managerAvg: avg(e.mgr),
    count: e.count
  }));
}

/**
 * Overall weighted score as a percentage (0-100).
 * categoryScore (1-5) -> /5 -> * weight, summed over categories that have a score.
 * Weights are renormalized over the categories that actually have scores.
 */
export function overallPercent(
  rollups: CategoryRollup[],
  which: "self" | "manager"
): number | null {
  let weighted = 0;
  let totalWeight = 0;
  for (const r of rollups) {
    const v = which === "self" ? r.selfAvg : r.managerAvg;
    if (v === null) continue;
    weighted += (v / 5) * r.weight;
    totalWeight += r.weight;
  }
  if (totalWeight === 0) return null;
  return (weighted / totalWeight) * 100;
}

export function scoreLabel(percent: number | null): string {
  if (percent === null) return "—";
  if (percent >= 90) return "Outstanding";
  if (percent >= 75) return "Exceeds";
  if (percent >= 60) return "Meets";
  if (percent >= 40) return "Needs Improvement";
  return "Below Expectations";
}
