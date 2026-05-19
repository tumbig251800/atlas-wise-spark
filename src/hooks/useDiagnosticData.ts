import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type DiagnosticEvent = Tables<"diagnostic_events">;
export type StrikeCounter = Tables<"strike_counter">;

export interface PivotEvent {
  id: string;
  class_id: string;
  subject: string;
  normalized_topic: string;
  trigger_session_id: string;
  evidence_refs: string[];
  reason_code: string;
  teacher_id: string;
  created_at: string;
}

export interface DiagnosticColorCounts {
  red: number;
  orange: number;
  yellow: number;
  blue: number;
  green: number;
}

export interface DiagnosticFilter {
  subject?: string;
  gradeLevel?: string;
  classroom?: string;
  /** Restrict events to a specific set of teaching_log_ids (e.g., logs of one academic term). */
  teachingLogIds?: string[];
}

interface DiagnosticQueryOptions {
  contextFirst?: boolean;
}

export function useDiagnosticData(filter?: DiagnosticFilter, options?: DiagnosticQueryOptions) {
  const { user } = useAuth();
  const contextFirst = options?.contextFirst === true;
  const hasCompleteContext = Boolean(filter?.subject && filter?.gradeLevel && filter?.classroom);

  const teachingLogIdsKey = filter?.teachingLogIds ? filter.teachingLogIds.slice().sort().join(",") : "";
  const filterKey = filter
    ? `${filter.subject ?? ""}|${filter.gradeLevel ?? ""}|${filter.classroom ?? ""}|${teachingLogIdsKey}`
    : "all";

  const eventsQuery = useQuery({
    queryKey: ["diagnostic-events", user?.id, filterKey],
    queryFn: async () => {
      let q = supabase.from("diagnostic_events").select("*");
      if (contextFirst && filter?.subject && filter?.gradeLevel && filter?.classroom) {
        q = q
          .eq("subject", filter.subject)
          .eq("grade_level", filter.gradeLevel)
          .eq("classroom", filter.classroom);
      }
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return data as DiagnosticEvent[];
    },
    enabled: !!user && (!contextFirst || hasCompleteContext),
  });

  const strikesQuery = useQuery({
    queryKey: ["strike-counters", user?.id, filterKey],
    queryFn: async () => {
      let q = supabase.from("strike_counter").select("*");
      if (contextFirst && filter?.subject) {
        q = q.eq("subject", filter.subject);
      }
      const { data, error } = await q.order("last_updated", { ascending: false });
      if (error) throw error;
      return data as StrikeCounter[];
    },
    enabled: !!user && (!contextFirst || hasCompleteContext),
  });

  const pivotEventsQuery = useQuery({
    queryKey: ["pivot-events", user?.id, filterKey],
    queryFn: async () => {
      let q = supabase.from("pivot_events").select("*");
      if (contextFirst && filter?.subject && filter?.gradeLevel && filter?.classroom) {
        q = q
          .eq("subject", filter.subject)
          .eq("class_id", `${filter.gradeLevel}/${filter.classroom}`);
      }
      const { data, error } = await q.order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as PivotEvent[];
    },
    enabled: !!user && (!contextFirst || hasCompleteContext),
  });

  const allDiagnosticEvents = eventsQuery.data ?? [];
  const allStrikes = strikesQuery.data ?? [];
  const allPivotEvents = pivotEventsQuery.data ?? [];

  // Filter by subject/class if filter is provided (prevents Data Leakage)
  // teachingLogIds: when set, scope events to a specific cohort of logs (e.g., one academic term)
  const teachingLogIdSet = filter?.teachingLogIds ? new Set(filter.teachingLogIds) : null;
  const diagnosticEvents = filter
    ? allDiagnosticEvents.filter((e) => {
        const matchSubject = !filter.subject || e.subject === filter.subject;
        const matchGrade = !filter.gradeLevel || e.grade_level === filter.gradeLevel;
        const matchClass = !filter.classroom || e.classroom === filter.classroom;
        const matchLogId = !teachingLogIdSet || (e.teaching_log_id ? teachingLogIdSet.has(e.teaching_log_id) : false);
        return matchSubject && matchGrade && matchClass && matchLogId;
      })
    : allDiagnosticEvents;

  const strikes = filter
    ? allStrikes.filter((s) => {
        const matchSubject = !filter.subject || s.subject === filter.subject;
        // scope="class": scope_id is "grade/classroom" e.g. "ป.4/1"
        // scope="student": scope_id is student_id — no grade/class in strike_counter, filter by subject only
        if (s.scope === "student") return matchSubject;
        const scopeStr = s.scope_id ?? "";
        const matchGrade = !filter.gradeLevel || scopeStr.includes(filter.gradeLevel);
        const matchClass = !filter.classroom || scopeStr.includes(`/${filter.classroom}`);
        return matchSubject && matchGrade && matchClass;
      })
    : allStrikes;

  const pivotEvents = filter
    ? allPivotEvents.filter((p) => {
        const matchSubject = !filter.subject || p.subject === filter.subject;
        const classStr = p.class_id ?? "";
        const matchGrade = !filter.gradeLevel || classStr.includes(filter.gradeLevel);
        const matchClass = !filter.classroom || classStr.includes(`/${filter.classroom}`);
        // DB column is teaching_log_id (types.ts has stale trigger_session_id — not yet regenerated)
        const logIdField = (p as unknown as { teaching_log_id?: string; trigger_session_id?: string });
        const linkedLogId = logIdField.teaching_log_id ?? logIdField.trigger_session_id;
        const matchLogId = !teachingLogIdSet || (linkedLogId ? teachingLogIdSet.has(linkedLogId) : false);
        return matchSubject && matchGrade && matchClass && matchLogId;
      })
    : allPivotEvents;

  // Strict UI Policy: count only session-level rows (student_id IS NULL)
  const sessionEvents = diagnosticEvents.filter((e) => !e.student_id);
  const colorCounts: DiagnosticColorCounts = {
    red: sessionEvents.filter((e) => e.status_color === "red").length,
    orange: sessionEvents.filter((e) => e.status_color === "orange").length,
    yellow: sessionEvents.filter((e) => e.status_color === "yellow").length,
    blue: sessionEvents.filter((e) => e.status_color === "blue").length,
    green: sessionEvents.filter((e) => e.status_color === "green").length,
  };

  const activeStrikes = strikes.filter((s) => s.status === "active" && s.strike_count >= 2);
  const referralQueue = diagnosticEvents.filter((e) => e.gap_type === "a2-gap");

  return {
    diagnosticEvents,
    allDiagnosticEvents,
    strikes,
    pivotEvents,
    colorCounts,
    activeStrikes,
    referralQueue,
    isLoading: eventsQuery.isLoading || strikesQuery.isLoading || pivotEventsQuery.isLoading,
  };
}
