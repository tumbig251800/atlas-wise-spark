import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";

export type TrendAlertType = "falling" | "redzone";

export interface TrendAlert {
  type: TrendAlertType;
  gradeLevel: string;
  classroom: string;
  subject: string;
  teacherName: string | null;
  /** mastery scores of last 3 sessions, oldest → newest */
  scores: number[];
}

interface RawLog {
  grade_level: string;
  classroom: string;
  subject: string;
  mastery_score: number;
  teaching_date: string;
  teacher_name: string | null;
}

const RED_ZONE_THRESHOLD = 2.5; // ≤ 2.5 / 5 = 50%

function computeAlerts(logs: RawLog[]): TrendAlert[] {
  // Group by (grade_level, classroom, subject)
  const groups = new Map<string, RawLog[]>();
  for (const log of logs) {
    const key = `${log.grade_level}||${log.classroom}||${log.subject}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }

  const alerts: TrendAlert[] = [];

  for (const groupLogs of groups.values()) {
    if (groupLogs.length < 3) continue;

    // Sort ascending by date → take last 3
    const sorted = [...groupLogs].sort((a, b) =>
      a.teaching_date.localeCompare(b.teaching_date)
    );
    const last3 = sorted.slice(-3);
    const scores = last3.map((l) => l.mastery_score);
    const [s1, s2, s3] = scores;
    const { grade_level, classroom, subject, teacher_name } = last3[2];

    // Case 1: Falling Down — strictly decreasing
    if (s3 < s2 && s2 < s1) {
      alerts.push({ type: "falling", gradeLevel: grade_level, classroom, subject, teacherName: teacher_name, scores });
      continue;
    }

    // Case 2: Red Zone — all 3 sessions ≤ 50%
    if (scores.every((s) => s <= RED_ZONE_THRESHOLD)) {
      alerts.push({ type: "redzone", gradeLevel: grade_level, classroom, subject, teacherName: teacher_name, scores });
    }
  }

  return alerts;
}

/**
 * Detects trend alerts across all teaching logs (director only).
 * Uses shared React Query cache key so data is fetched once.
 */
export function useTrendAlerts() {
  const { user, role } = useAuth();

  const { data: logs = [] } = useQuery<RawLog[]>({
    queryKey: ["trend-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teaching_logs")
        .select("grade_level, classroom, subject, mastery_score, teaching_date, teacher_name")
        .order("teaching_date", { ascending: true });
      if (error) throw error;
      return data as RawLog[];
    },
    enabled: !!user && role === "director",
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return useMemo(() => {
    const alerts = computeAlerts(logs);
    return {
      alerts,
      hasAlerts: alerts.length > 0,
      fallingCount: alerts.filter((a) => a.type === "falling").length,
      redzoneCount: alerts.filter((a) => a.type === "redzone").length,
    };
  }, [logs]);
}
