import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useToast } from "@/hooks/use-toast";
import type { ActionItem } from "@/hooks/useActionItems";

/** Red Zone threshold at the unit-assessment level (matches computeUnitBlindSpotMetric). */
const RED_ZONE_RATIO = 0.5;

export interface CaseStudentRow {
  id: string; // students.id (uuid)
  code: string; // students.student_id (text roster code)
  name: string;
  scorePct: number | null; // latest score / total_score, null if no score
  isRedZone: boolean; // scorePct != null && scorePct < 0.5  ← primary selection criterion (ก)
  linked: boolean; // already in action_item_students for this case
  selectionSource: string | null;
}

export const caseStudentsKey = (actionItemId: number) => ["case-students", actionItemId] as const;

/**
 * Roster of the case's class merged with (a) the teacher's latest unit scores
 * (to flag Red Zone students — the primary selection criterion) and (b) which
 * students are already linked to the case. The UI pre-selects Red Zone students
 * (selection_source='system_detected'); the teacher then adjusts.
 */
export function useCaseStudents(item: ActionItem) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: caseStudentsKey(item.id),
    enabled: !!item.teacher_id && !!item.grade_level && !!item.classroom,
    queryFn: async (): Promise<CaseStudentRow[]> => {
      // 1) class roster
      let rosterQ = supabase
        .from("students")
        .select("id, student_id, first_name, last_name")
        .eq("teacher_id", item.teacher_id!)
        .eq("grade_level", item.grade_level!)
        .eq("classroom", item.classroom!);
      const { data: roster, error: rErr } = await rosterQ;
      if (rErr) throw rErr;
      const rosterRows = roster ?? [];
      if (rosterRows.length === 0) return [];

      // 2) latest unit score per student (Red Zone = score/total < 0.5)
      let scoreQ = supabase
        .from("unit_assessments")
        .select("student_id, score, total_score, assessed_date")
        .eq("teacher_id", item.teacher_id!)
        .eq("grade_level", item.grade_level!)
        .eq("classroom", item.classroom!);
      if (item.subject) scoreQ = scoreQ.eq("subject", item.subject);
      const { data: scores } = await scoreQ;
      const latestByCode = new Map<string, { pct: number; date: string }>();
      (scores ?? []).forEach((s) => {
        if (!s.student_id || !s.total_score) return;
        const pct = Number(s.score) / Number(s.total_score);
        const date = String(s.assessed_date ?? "");
        const prev = latestByCode.get(s.student_id);
        if (!prev || date > prev.date) latestByCode.set(s.student_id, { pct, date });
      });

      // 3) already-linked students for this case
      const { data: linked } = await supabase
        .from("action_item_students")
        .select("student_id, selection_source")
        .eq("action_item_id", item.id);
      const linkedById = new Map<string, string>(
        (linked ?? []).map((l) => [l.student_id, l.selection_source])
      );

      return rosterRows.map((r) => {
        const score = r.student_id ? latestByCode.get(r.student_id) : undefined;
        const scorePct = score?.pct ?? null;
        return {
          id: r.id,
          code: r.student_id ?? "",
          name: `${r.first_name} ${r.last_name}`.trim(),
          scorePct,
          isRedZone: scorePct != null && scorePct < RED_ZONE_RATIO,
          linked: linkedById.has(r.id),
          selectionSource: linkedById.get(r.id) ?? null,
        };
      });
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: caseStudentsKey(item.id) });

  const addStudents = useMutation({
    mutationFn: async ({
      studentIds,
      userId,
      source,
    }: {
      studentIds: string[];
      userId: string;
      source: "individual" | "group" | "whole_class" | "system_detected";
    }) => {
      if (studentIds.length === 0) return;
      const rows = studentIds.map((sid) => ({
        action_item_id: item.id,
        student_id: sid,
        selection_source: source,
        created_by: userId,
      }));
      const { error } = await supabase.from("action_item_students").upsert(rows, {
        onConflict: "action_item_id,student_id",
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "เพิ่มนักเรียนเข้าเคสแล้ว" });
    },
    onError: (e: Error) => toast({ title: "เพิ่มไม่สำเร็จ", description: e.message, variant: "destructive" }),
  });

  const removeStudent = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("action_item_students")
        .delete()
        .eq("action_item_id", item.id)
        .eq("student_id", studentId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "เอาออกไม่สำเร็จ", description: e.message, variant: "destructive" }),
  });

  return { ...query, addStudents, removeStudent };
}
