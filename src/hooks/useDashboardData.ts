import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { sortClassrooms } from "@/lib/utils";

export type TeachingLog = Tables<"teaching_logs">;

export interface DashboardFilters {
  gradeLevel: string;
  classroom: string;
  subject: string;
  academicTerm: string;
}

export interface FilterOptions {
  gradeLevels: string[];
  classrooms: string[];
  subjects: string[];
  academicTerms: string[];
}

export interface ContextFilter {
  gradeLevel?: string;
  classroom?: string;
  subject?: string;
  academicTerm?: string;
}

const STORAGE_KEY = "atlas_dashboard_filters";

export function loadPersistedFilters(): DashboardFilters {
  // Always start with "all" to prevent stale filters hiding data
  return { gradeLevel: "", classroom: "", subject: "", academicTerm: "" };
}

/** Load filters from localStorage (Dashboard persist). Use for Consultant sync. */
export function getPersistedFiltersFromStorage(): DashboardFilters | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DashboardFilters>;
    if (parsed?.subject && parsed?.gradeLevel && parsed?.classroom) {
      return {
        subject: parsed.subject,
        gradeLevel: parsed.gradeLevel,
        classroom: parsed.classroom,
        academicTerm: parsed.academicTerm ?? "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function persistFilters(filters: DashboardFilters) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export function useDashboardData(filters: DashboardFilters) {
  const { user } = useAuth();

  // Fetch all logs (RLS handles teacher vs director)
  const logsQuery = useQuery({
    queryKey: ["dashboard-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teaching_logs")
        .select("*")
        .order("teaching_date", { ascending: true });
      if (error) throw error;
      return data as TeachingLog[];
    },
    enabled: !!user,
  });

  const allLogs = logsQuery.data ?? [];

  // Derive filter options from all logs (ensure string for Select compatibility)
  const filterOptions: FilterOptions = {
    gradeLevels: [...new Set(allLogs.map((l) => l.grade_level))].sort(),
    classrooms: sortClassrooms([...new Set(allLogs.map((l) => String(l.classroom ?? "")))].filter(Boolean)),
    subjects: [...new Set(allLogs.map((l) => l.subject))].sort(),
    // Newest term first so default selection picks the latest
    academicTerms: [...new Set(allLogs.map((l) => l.academic_term).filter(Boolean) as string[])].sort().reverse(),
  };

  // Apply filters (use .toString() for classroom to handle DB number vs Filter string mismatch)
  const filteredLogs = allLogs.filter((l) => {
    if (filters.gradeLevel && l.grade_level !== filters.gradeLevel) return false;
    if (filters.classroom && String(l.classroom ?? "") !== String(filters.classroom ?? "")) return false;
    if (filters.subject && l.subject !== filters.subject) return false;
    if (filters.academicTerm && l.academic_term !== filters.academicTerm) return false;
    return true;
  });

  return {
    allLogs,
    filteredLogs,
    filterOptions,
    isLoading: logsQuery.isLoading,
    error: logsQuery.error,
  };
}

export function useDashboardFilterOptions() {
  const { user } = useAuth();

  const optionsQuery = useQuery({
    queryKey: ["dashboard-filter-options", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teaching_logs")
        .select("grade_level,classroom,subject,academic_term")
        .order("teaching_date", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const rows = data ?? [];
      return {
        gradeLevels: [...new Set(rows.map((l) => l.grade_level))].filter(Boolean).sort(),
        classrooms: sortClassrooms([...new Set(rows.map((l) => String(l.classroom ?? "")))].filter(Boolean)),
        subjects: [...new Set(rows.map((l) => l.subject))].filter(Boolean).sort(),
        academicTerms: [...new Set(rows.map((l) => l.academic_term).filter(Boolean) as string[])].sort().reverse(),
      } satisfies FilterOptions;
    },
    enabled: !!user,
  });

  return {
    filterOptions: optionsQuery.data ?? { gradeLevels: [], classrooms: [], subjects: [], academicTerms: [] },
    isLoading: optionsQuery.isLoading,
    error: optionsQuery.error,
  };
}

export function useContextFirstTeachingLogs(filter: ContextFilter) {
  const { user } = useAuth();
  const hasCompleteContext = Boolean(filter.subject && filter.gradeLevel && filter.classroom);

  const logsQuery = useQuery({
    queryKey: [
      "consultant-context-logs",
      user?.id,
      filter.subject ?? "",
      filter.gradeLevel ?? "",
      filter.classroom ?? "",
    ],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teaching_logs")
        .select("*")
        .eq("subject", filter.subject ?? "")
        .eq("grade_level", filter.gradeLevel ?? "")
        .eq("classroom", filter.classroom ?? "")
        .order("teaching_date", { ascending: true });
      if (error) throw error;
      return data as TeachingLog[];
    },
    enabled: !!user && hasCompleteContext,
  });

  return {
    logs: logsQuery.data ?? [],
    hasCompleteContext,
    isLoading: logsQuery.isLoading,
    error: logsQuery.error,
  };
}
