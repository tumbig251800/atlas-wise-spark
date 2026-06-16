import { useMemo } from "react";
import { useActionItems, type ActionItem } from "./useActionItems";

export type PlcQueueGroup = {
  id: string;
  priority: number;
  subject: string;
  gradeBand: "ป.1-2" | "ป.3-4" | "ป.5-6";
  items: ActionItem[];
  dominantType: "RedZone" | "MasteryDrop" | "UnitBlindSpot";
  averageMetric: number | null;
  teacherIds: string[];
  teacherNames: string[];
};

function calculatePriority(item: ActionItem): number {
  const type = item.issue_type;
  const metric = Number(item.metric_value ?? 0);

  if (type === "RedZone") return 1000;
  if (type === "MasteryDrop") {
    if (metric >= 1.0) return 900;
    if (metric >= 0.5) return 800;
    return 700;
  }
  if (type === "UnitBlindSpot") {
    if (metric < 50) return 600;
    if (metric < 60) return 500;
    return 400;
  }
  return 0;
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

    // Group by teacher + subject (1 PLC per teacher per subject, all grades together)
    const groupMap = new Map<string, ActionItem[]>();

    queueableItems.forEach((item) => {
      const teacherKey = item.teacher_id ?? item.teacher_name ?? "unknown";
      const subject = item.subject ?? "ไม่ระบุวิชา";
      const key = `${teacherKey}|${subject}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    });

    const groups: PlcQueueGroup[] = [];
    let groupIndex = 0;

    groupMap.forEach((items) => {
      const subject = items[0].subject ?? "ไม่ระบุวิชา";

      // Pick representative grade band (most common)
      const bandCounts: Record<string, number> = {};
      items.forEach((i) => {
        const b = getGradeBand(i.grade_level);
        if (b) bandCounts[b] = (bandCounts[b] ?? 0) + 1;
      });
      const gradeBand = (Object.entries(bandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "ป.1-2") as
        "ป.1-2" | "ป.3-4" | "ป.5-6";

      const maxPriority = Math.max(...items.map(calculatePriority));

      const typeCounts: Record<string, number> = {};
      items.forEach((item) => {
        typeCounts[item.issue_type] = (typeCounts[item.issue_type] ?? 0) + 1;
      });
      const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as
        "RedZone" | "MasteryDrop" | "UnitBlindSpot";

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

    return groups.sort((a, b) => b.priority - a.priority);
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
