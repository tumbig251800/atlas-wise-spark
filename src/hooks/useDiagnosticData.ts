import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
}

export function useDiagnosticData(filter?: DiagnosticFilter) {
  const { user } = useAuth();

  const eventsQuery = useQuery({
    queryKey: ["diagnostic-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagnostic_events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DiagnosticEvent[];
    },
    enabled: !!user,
  });

  const strikesQuery = useQuery({
    queryKey: ["strike-counters", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strike_counter")
        .select("*")
        .order("last_updated", { ascending: false });
      if (error) throw error;
      return data as StrikeCounter[];
    },
    enabled: !!user,
  });

  const pivotEventsQuery = useQuery({
    queryKey: ["pivot-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pivot_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as PivotEvent[];
    },
    enabled: !!user,
  });

  const allDiagnosticEvents = eventsQuery.data ?? [];
  const allStrikes = strikesQuery.data ?? [];
  const allPivotEvents = pivotEventsQuery.data ?? [];

  // Filter by subject/class if filter is provided (prevents Data Leakage)
  const diagnosticEvents = filter
    ? allDiagnosticEvents.filter((e) => {
        const matchSubject = !filter.subject || e.subject === filter.subject;
        const matchGrade = !filter.gradeLevel || e.grade_level === filter.gradeLevel;
        const matchClass = !filter.classroom || e.classroom === filter.classroom;
        return matchSubject && matchGrade && matchClass;
      })
    : allDiagnosticEvents;

  const strikes = filter
    ? allStrikes.filter((s) => {
        const matchSubject = !filter.subject || s.subject === filter.subject;
        return matchSubject;
      })
    : allStrikes;

  const pivotEvents = filter
    ? allPivotEvents.filter((p) => {
        const matchSubject = !filter.subject || p.subject === filter.subject;
        return matchSubject;
      })
    : allPivotEvents;

  const colorCounts: DiagnosticColorCounts = {
    red: diagnosticEvents.filter((e) => e.status_color === "red").length,
    orange: diagnosticEvents.filter((e) => e.status_color === "orange").length,
    yellow: diagnosticEvents.filter((e) => e.status_color === "yellow").length,
    blue: diagnosticEvents.filter((e) => e.status_color === "blue").length,
    green: diagnosticEvents.filter((e) => e.status_color === "green").length,
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
