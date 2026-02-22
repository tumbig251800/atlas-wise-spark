import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type TeachingLog = Tables<"teaching_logs">;

export interface DashboardFilters {
  gradeLevel: string;
  classroom: string;
  subject: string;
}

export interface FilterOptions {
  gradeLevels: string[];
  classrooms: string[];
  subjects: string[];
}

const STORAGE_KEY = "atlas_dashboard_filters";

export function loadPersistedFilters(): DashboardFilters {
  // Always start with "all" to prevent stale filters hiding data
  return { gradeLevel: "", classroom: "", subject: "" };
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
    classrooms: [...new Set(allLogs.map((l) => String(l.classroom ?? "")))].filter(Boolean).sort(),
    subjects: [...new Set(allLogs.map((l) => l.subject))].sort(),
  };

  // Apply filters (use .toString() for classroom to handle DB number vs Filter string mismatch)
  const filteredLogs = allLogs.filter((l) => {
    if (filters.gradeLevel && l.grade_level !== filters.gradeLevel) return false;
    if (filters.classroom && String(l.classroom ?? "") !== String(filters.classroom ?? "")) return false;
    if (filters.subject && l.subject !== filters.subject) return false;
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
