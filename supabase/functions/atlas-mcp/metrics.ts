// Single source of truth for Red Zone definition.
// Import from here — never hardcode 2.5 anywhere else.
export const RED_ZONE_THRESHOLD = 2.5;

export function isRedZone(masteryScore: number): boolean {
  return masteryScore <= RED_ZONE_THRESHOLD;
}

export function computeGapDistribution(
  logs: { major_gap: string }[]
): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const log of logs) {
    const gap = log.major_gap || "unknown";
    dist[gap] = (dist[gap] || 0) + 1;
  }
  return dist;
}

export function avgMastery(scores: number[]): number {
  if (!scores.length) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
