import { useMemo } from "react";
import { useActionItems, type ActionItem } from "./useActionItems";

export type PlcQueueGroup = {
  id: string;
  priority: number;
  subject: string;
  gradeBand: "ป.1-2" | "ป.3-4" | "ป.5-6";
  items: ActionItem[];
  dominantType: string;
  averageMetric: number | null;
  teacherIds: string[];
  teacherNames: string[];
  weekSlot: number; // สัปดาห์ที่ควรจัด (1, 2, 3, ...) — ครูที่ซ้ำกันต้องไม่อยู่สัปดาห์เดียวกัน
};

// Base priority comes from the row's own `severity` column (set at insert time by
// whoever created the item — n8n, edge function, etc.) so any issue_type, including
// ones this file has never heard of, is ranked correctly by default. The per-type
// bonus below only fine-tunes ordering *within* a severity band for the two types
// where we have a meaningful metric scale to sort on.
const SEVERITY_BASE: Record<string, number> = { critical: 1000, high: 700, medium: 400, low: 200 };

function calculatePriority(item: ActionItem): number {
  const base = SEVERITY_BASE[item.severity] ?? 300;
  const type = item.issue_type;
  const metric = Number(item.metric_value ?? 0);

  let bonus = 0;
  if (type === "MasteryDrop") {
    bonus = metric >= 1.0 ? 200 : metric >= 0.5 ? 100 : 0;
  } else if (type === "UnitBlindSpot") {
    bonus = metric < 50 ? 200 : metric < 60 ? 100 : 0;
  }

  return base + bonus;
}

function getGradeBand(gradeLevel: string | null): "ป.1-2" | "ป.3-4" | "ป.5-6" | null {
  if (!gradeLevel) return null;
  const level = gradeLevel.toLowerCase();
  if (level.includes("ป.1") || level.includes("ป.2") || level.includes("ป1") || level.includes("ป2")) return "ป.1-2";
  if (level.includes("ป.3") || level.includes("ป.4") || level.includes("ป3") || level.includes("ป4")) return "ป.3-4";
  if (level.includes("ป.5") || level.includes("ป.6") || level.includes("ป5") || level.includes("ป6")) return "ป.5-6";
  return null;
}

export function usePlcQueue() {
  const { data: allItems } = useActionItems();

  const queueGroups = useMemo<PlcQueueGroup[]>(() => {
    if (!allItems) return [];

    const queueableItems = allItems.filter(
      (item) =>
        item.issue_type !== "IntegrityFlag" &&
        (item.status === "open" || item.status === "watching")
    );

    if (queueableItems.length === 0) return [];

    // Group by grade band — each PLC session covers all teachers in the same band
    const groupMap = new Map<string, ActionItem[]>();

    queueableItems.forEach((item) => {
      const band = getGradeBand(item.grade_level) ?? "ป.1-2";
      if (!groupMap.has(band)) groupMap.set(band, []);
      groupMap.get(band)!.push(item);
    });

    const groups: PlcQueueGroup[] = [];
    let groupIndex = 0;

    groupMap.forEach((items, band) => {
      const gradeBand = band as "ป.1-2" | "ป.3-4" | "ป.5-6";

      // Subject label: list unique subjects in this band
      const uniqueSubjects = [...new Set(items.map((i) => i.subject).filter(Boolean))];
      const subject = uniqueSubjects.slice(0, 3).join(", ") + (uniqueSubjects.length > 3 ? "..." : "");

      const maxPriority = Math.max(...items.map(calculatePriority));

      // Badge shows whichever item is actually driving the group's priority —
      // stays consistent with maxPriority above instead of a separately maintained rank table.
      const dominantType = items.reduce((worst, item) =>
        calculatePriority(item) > calculatePriority(worst) ? item : worst
      , items[0]).issue_type;

      const metricsWithValues = items.filter((i) => i.metric_value !== null);
      const averageMetric =
        metricsWithValues.length > 0
          ? metricsWithValues.reduce((sum, i) => sum + Number(i.metric_value ?? 0), 0) / metricsWithValues.length
          : null;

      const teacherIds = [...new Set(items.map((i) => i.teacher_id).filter(Boolean) as string[])];
      const teacherNames = [...new Set(items.map((i) => i.teacher_name).filter(Boolean) as string[])];

      groups.push({
        id: `plc-queue-${groupIndex++}`,
        priority: maxPriority,
        subject,
        gradeBand,
        items,
        dominantType,
        averageMetric,
        teacherIds,
        teacherNames,
      });
    });

    const sorted = groups.sort((a, b) => b.priority - a.priority);

    // Assign week slots: greedy — for each group (highest priority first),
    // pick the earliest week where none of its teachers already appear
    const teacherWeekMap = new Map<string, Set<number>>(); // teacherId → weeks already used

    sorted.forEach((group) => {
      let week = 1;
      while (true) {
        const conflict = group.teacherIds.some((tid) =>
          teacherWeekMap.get(tid)?.has(week)
        );
        if (!conflict) break;
        week++;
      }
      group.weekSlot = week;
      group.teacherIds.forEach((tid) => {
        if (!teacherWeekMap.has(tid)) teacherWeekMap.set(tid, new Set());
        teacherWeekMap.get(tid)!.add(week);
      });
    });

    return sorted;
  }, [allItems]);

  const integrityFlags = useMemo(() => {
    if (!allItems) return [];
    return allItems.filter(
      (item) =>
        item.issue_type === "IntegrityFlag" &&
        (item.status === "open" || item.status === "watching")
    );
  }, [allItems]);

  return { queueGroups, integrityFlags };
}
