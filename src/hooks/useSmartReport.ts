/**
 * Phase C: Smart Report hook
 * Fetches logs + assessments, builds SmartReport via engine
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTeachingLogs,
  fetchUnitAssessments,
  fetchFilterOptions,
  type SmartReportFilterOptions,
} from "@/lib/smartReportQueries";
import { buildSmartReport } from "@/lib/smartReportEngine";
import type { SmartReport, SmartReportFilter } from "@/types/smartReport";

export function useSmartReport(filters: SmartReportFilter) {
  const { user } = useAuth();

  const logsQuery = useQuery({
    queryKey: ["smart-logs", filters],
    queryFn: () => fetchTeachingLogs(filters),
    enabled: !!user,
  });

  const assessmentsQuery = useQuery({
    queryKey: ["smart-assessments", filters],
    queryFn: () => fetchUnitAssessments(filters),
    enabled: !!user,
  });

  const optionsQuery = useQuery({
    queryKey: ["smart-report-options"],
    queryFn: fetchFilterOptions,
    enabled: !!user,
  });

  const logs = logsQuery.data ?? [];
  const assessments = assessmentsQuery.data ?? [];

  const report = useMemo<SmartReport>(
    () => buildSmartReport(filters, logs, assessments),
    [filters, logs, assessments]
  );

  const isLoading = logsQuery.isLoading || assessmentsQuery.isLoading;
  const error = logsQuery.error ?? assessmentsQuery.error;

  const filterOptions: SmartReportFilterOptions = {
    subjects: optionsQuery.data?.subjects ?? [],
    gradeLevels: optionsQuery.data?.gradeLevels ?? [],
    classrooms: optionsQuery.data?.classrooms ?? [],
    academicTerms: optionsQuery.data?.academicTerms ?? [],
  };

  return {
    report,
    logs,
    assessments,
    filterOptions,
    isLoading,
    error,
  };
}
