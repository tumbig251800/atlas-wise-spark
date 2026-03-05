/**
 * Phase D Stage 3: Competency Report hook
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchStudentList,
  fetchStudentCompetency,
  fetchCompetencyFilterOptions,
  type StudentOption,
  type StudentCompetencyData,
} from "@/lib/competencyReportQueries";
import type { SmartReportFilter } from "@/types/smartReport";

export function useStudentList(filter: SmartReportFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competency-student-list", filter, user?.id],
    queryFn: () => fetchStudentList(filter, user!.id),
    enabled: !!user,
  });
}

export function useStudentCompetency(
  studentId: string | null,
  filter: SmartReportFilter
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competency-student-data", studentId, filter, user?.id],
    queryFn: () =>
      studentId && user
        ? fetchStudentCompetency(studentId, filter, user.id)
        : Promise.resolve(null),
    enabled: !!user && !!studentId,
  });
}

export function useCompetencyFilterOptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["competency-filter-options", user?.id],
    queryFn: () => fetchCompetencyFilterOptions(user!.id),
    enabled: !!user,
  });
}
