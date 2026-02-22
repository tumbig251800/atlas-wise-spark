import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ExecutiveMetricCards } from "@/components/executive/ExecutiveMetricCards";
import { GapPieChart } from "@/components/executive/GapPieChart";
import { MasteryBarChart } from "@/components/executive/MasteryBarChart";
import { ExecutiveFilters, type ExecFilters } from "@/components/executive/ExecutiveFilters";
import { PolicySummary } from "@/components/executive/PolicySummary";
import { SystemGapReport } from "@/components/executive/SystemGapReport";
import { StrikeEscalationView } from "@/components/executive/StrikeEscalationView";
import { ReferralQueue } from "@/components/executive/ReferralQueue";
import { useDiagnosticData } from "@/hooks/useDiagnosticData";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeachingLog } from "@/hooks/useDashboardData";

export default function Executive() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ExecFilters>({ dateFrom: "", dateTo: "", gradeLevel: "", classroom: "", subject: "", teacherName: "" });
  const [barGroupBy, setBarGroupBy] = useState<"grade" | "subject">("grade");
  const { diagnosticEvents, strikes, isLoading: diagLoading } = useDiagnosticData();

  // Fetch all logs (director RLS sees all)
  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ["exec-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teaching_logs").select("*").order("teaching_date", { ascending: false });
      if (error) throw error;
      return data as TeachingLog[];
    },
    enabled: !!user,
  });

  // Fetch profiles for teacher filter
  const { data: profiles = [] } = useQuery({
    queryKey: ["exec-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const teacherMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach((p) => { m[p.user_id] = p.full_name; });
    return m;
  }, [profiles]);

  // Derive filter options (cascading: options narrow based on prior selections)
  const gradeLevels = useMemo(() => [...new Set(allLogs.map((l) => l.grade_level))].sort(), [allLogs]);

  const classrooms = useMemo(() => {
    let base = allLogs;
    if (filters.gradeLevel) base = base.filter((l) => l.grade_level === filters.gradeLevel);
    return [...new Set(base.map((l) => String(l.classroom ?? "")))].filter(Boolean).sort();
  }, [allLogs, filters.gradeLevel]);

  const subjects = useMemo(() => {
    let base = allLogs;
    if (filters.gradeLevel) base = base.filter((l) => l.grade_level === filters.gradeLevel);
    if (filters.classroom) base = base.filter((l) => String(l.classroom ?? "") === String(filters.classroom ?? ""));
    return [...new Set(base.map((l) => l.subject))].sort();
  }, [allLogs, filters.gradeLevel, filters.classroom]);

  const teacherNames = useMemo(() => {
    let base = allLogs;
    if (filters.gradeLevel) base = base.filter((l) => l.grade_level === filters.gradeLevel);
    if (filters.classroom) base = base.filter((l) => String(l.classroom ?? "") === String(filters.classroom ?? ""));
    if (filters.subject) base = base.filter((l) => l.subject === filters.subject);
    const ids = new Set(base.map((l) => l.teacher_id));
    return profiles
      .filter((p) => ids.has(p.user_id) && p.full_name)
      .map((p) => p.full_name as string)
      .sort();
  }, [allLogs, profiles, filters.gradeLevel, filters.classroom, filters.subject]);

  useEffect(() => {
    if (filters.teacherName && !teacherNames.includes(filters.teacherName)) {
      setFilters((prev) => ({ ...prev, teacherName: "" }));
    }
  }, [filters.teacherName, teacherNames]);

  const teacherIdForName = useMemo(() => {
    const p = profiles.find((x) => x.full_name === filters.teacherName);
    return p?.user_id ?? null;
  }, [profiles, filters.teacherName]);

  // Apply filters to logs
  const filteredLogs = useMemo(() => {
    return allLogs.filter((l) => {
      if (filters.dateFrom && l.teaching_date < filters.dateFrom) return false;
      if (filters.dateTo && l.teaching_date > filters.dateTo) return false;
      if (filters.gradeLevel && l.grade_level !== filters.gradeLevel) return false;
      if (filters.classroom && String(l.classroom ?? "") !== String(filters.classroom ?? "")) return false;
      if (filters.subject && l.subject !== filters.subject) return false;
      if (filters.teacherName) {
        const name = teacherMap[l.teacher_id];
        if (name !== filters.teacherName) return false;
      }
      return true;
    });
  }, [allLogs, filters, teacherMap]);

  const filteredLogIds = useMemo(() => new Set(filteredLogs.map((l) => l.id)), [filteredLogs]);

  // Filter diagnosticEvents by main filters (match sessions in filteredLogs)
  const filteredDiagnosticEvents = useMemo(() => {
    return diagnosticEvents.filter((e) => {
      if (!filteredLogIds.has(e.teaching_log_id)) return false;
      if (filters.subject && e.subject !== filters.subject) return false;
      if (filters.gradeLevel && e.grade_level !== filters.gradeLevel) return false;
      if (filters.classroom && String(e.classroom ?? "") !== String(filters.classroom ?? "")) return false;
      if (teacherIdForName && e.teacher_id !== teacherIdForName) return false;
      return true;
    });
  }, [diagnosticEvents, filteredLogIds, filters.subject, filters.gradeLevel, filters.classroom, teacherIdForName]);

  // Filter strikes by subject, teacher, and grade/room (via scope_id for class-level strikes)
  const filteredStrikes = useMemo(() => {
    return strikes.filter((s) => {
      if (filters.subject && s.subject !== filters.subject) return false;
      if (teacherIdForName && s.teacher_id !== teacherIdForName) return false;
      const isClassScope = s.scope === "class" || s.scope === "classroom";
      if (!isClassScope) return true;
      const sid = String(s.scope_id ?? "").trim();
      if (filters.gradeLevel && filters.classroom) {
        if (sid !== `${filters.gradeLevel}/${filters.classroom}` && sid !== filters.classroom) return false;
      } else if (filters.gradeLevel) {
        if (!sid.startsWith(filters.gradeLevel)) return false;
      } else if (filters.classroom) {
        if (!sid.endsWith(`/${filters.classroom}`) && sid !== filters.classroom) return false;
      }
      return true;
    });
  }, [strikes, filters.subject, filters.gradeLevel, filters.classroom, teacherIdForName]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ภาพรวมผู้บริหาร</h1>

        <ExecutiveFilters
          filters={filters}
          onChange={setFilters}
          gradeLevels={gradeLevels}
          classrooms={classrooms}
          subjects={subjects}
          teacherNames={teacherNames}
        />

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <ExecutiveMetricCards logs={filteredLogs} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GapPieChart logs={filteredLogs} />
          <div className="space-y-3">
            <Tabs value={barGroupBy} onValueChange={(v) => setBarGroupBy(v as "grade" | "subject")}>
              <TabsList>
                <TabsTrigger value="grade">ตามชั้นเรียน</TabsTrigger>
                <TabsTrigger value="subject">ตามวิชา</TabsTrigger>
              </TabsList>
            </Tabs>
            <MasteryBarChart logs={filteredLogs} groupBy={barGroupBy} />
          </div>
        </div>

        <PolicySummary logs={filteredLogs} />

        {/* Phase 4 panels */}
        <div className="space-y-6">
          <ReferralQueue events={filteredDiagnosticEvents} />
          <StrikeEscalationView strikes={filteredStrikes} />
          <SystemGapReport events={filteredDiagnosticEvents} />
        </div>
      </div>
    </AppLayout>
  );
}
