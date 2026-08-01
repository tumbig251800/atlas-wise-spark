import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import type { ActionItem } from "@/hooks/useActionItems";
import type { EvidenceResult, ScoreSnapshot } from "@/domain/monitoringEvidence";

type ScoreRow = { student_id: string | null; score: number | null; total_score: number | null; assessed_date: string | null };

function toSnapshot(r: ScoreRow): ScoreSnapshot {
  return {
    score: Number(r.score),
    total_score: Number(r.total_score),
    pct: Number(r.score) / Number(r.total_score),
    assessed_date: r.assessed_date!,
  };
}

function latestOnOrBefore(rows: ScoreRow[], cutoff: string): ScoreRow | null {
  return rows
    .filter((r) => (r.assessed_date ?? "") <= cutoff)
    .reduce<ScoreRow | null>((best, r) => (!best || (r.assessed_date ?? "") > (best.assessed_date ?? "") ? r : best), null);
}

function latestStrictlyAfter(rows: ScoreRow[], cutoff: string): ScoreRow | null {
  return rows
    .filter((r) => (r.assessed_date ?? "") > cutoff)
    .reduce<ScoreRow | null>((best, r) => (!best || (r.assessed_date ?? "") > (best.assessed_date ?? "") ? r : best), null);
}

export interface MonitoringEvidencePair {
  before: EvidenceResult;
  after: EvidenceResult;
}

/**
 * Real before/after unit-score evidence per linked case student — one query
 * for the whole case, filtered the same way useCaseStudents.ts already does.
 * Cutoff is the intervention's start_date (not "today"), since a teacher may
 * open this screen well after the intervention actually began.
 */
export function useMonitoringEvidence(
  item: ActionItem,
  linkedStudents: { id: string; code: string }[],
  cutoffDate: string | null
) {
  return useQuery({
    queryKey: [
      "monitoring-evidence",
      item.id,
      cutoffDate,
      linkedStudents.map((s) => s.code).sort().join(","),
    ],
    enabled: !!item.teacher_id && !!item.grade_level && !!item.classroom && !!cutoffDate && linkedStudents.length > 0,
    queryFn: async (): Promise<Map<string, MonitoringEvidencePair>> => {
      let q = supabase
        .from("unit_assessments")
        .select("student_id, score, total_score, assessed_date")
        .eq("teacher_id", item.teacher_id!)
        .eq("grade_level", item.grade_level!)
        .eq("classroom", item.classroom!);
      if (item.subject) q = q.eq("subject", item.subject);
      const { data, error } = await q;
      if (error) throw error;

      const byCode = new Map<string, ScoreRow[]>();
      (data ?? []).forEach((r) => {
        if (!r.student_id || !r.total_score) return;
        const list = byCode.get(r.student_id) ?? [];
        list.push(r as ScoreRow);
        byCode.set(r.student_id, list);
      });

      const out = new Map<string, MonitoringEvidencePair>();
      for (const s of linkedStudents) {
        const rows = byCode.get(s.code) ?? [];
        const beforeRow = latestOnOrBefore(rows, cutoffDate!);
        const afterRow = latestStrictlyAfter(rows, cutoffDate!);
        out.set(s.id, {
          before: beforeRow
            ? { kind: "ok", snapshot: toSnapshot(beforeRow) }
            : { kind: "unavailable", reason: "ไม่มีคะแนนหน่วยก่อนวันที่เริ่มแทรกแซง" },
          after: afterRow
            ? { kind: "ok", snapshot: toSnapshot(afterRow) }
            : { kind: "unavailable", reason: "ยังไม่มีคะแนนหน่วยรอบใหม่หลังวันที่เริ่มแทรกแซง" },
        });
      }
      return out;
    },
  });
}
