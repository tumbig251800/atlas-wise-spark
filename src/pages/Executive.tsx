import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/lib/atlasSupabase";
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
import { Button } from "@/components/ui/button";
import type { TeachingLog } from "@/hooks/useDashboardData";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

function extractValidIdsFromCsv(csv: string | null): string[] {
  return String(csv ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "[None]" && s !== "[N/A]" && /^\d{4,5}$/.test(s));
}

function toActivityLabel(mode: string | null): string {
  if (mode === "passive") return "Passive";
  if (mode === "constructive") return "Constructive";
  return "Active";
}

function buildExecutiveChatContext(logs: TeachingLog[], filters: ExecFilters): string {
  if (logs.length === 0) return "ไม่พบข้อมูลการสอนที่ตรงกับตัวกรองนี้";

  // Sort by teaching_date asc so REF ordering is stable.
  const ordered = [...logs].sort((a, b) => a.teaching_date.localeCompare(b.teaching_date));
  const slice = ordered.slice(-20);

  const avgMastery = (logs.reduce((s, l) => s + l.mastery_score, 0) / logs.length).toFixed(1);

  const refList = slice.map((_, i) => `[REF-${i + 1}]`).join(", ");

  const extractedRemedialIds = [...new Set(logs.flatMap((l) => extractValidIdsFromCsv(l.remedial_ids)))];
  const extractedHealthCareIds = [...new Set(logs.flatMap((l) => extractValidIdsFromCsv(l.health_care_ids)))];

  const hasTotalStudents = slice.some((l) => (l.total_students ?? 0) > 0);
  const hasRemedialIds = extractedRemedialIds.length > 0;
  const hasHealthCareIds = extractedHealthCareIds.length > 0;

  const sessionDetails = slice
    .map((l, index) => {
      const refId = `[REF-${index + 1}]`;
      const remedialIds = extractValidIdsFromCsv(l.remedial_ids);
      const remedialCount = remedialIds.length;
      const total = l.total_students ?? 0;
      return `${refId} วันที่: ${l.teaching_date} | วิชา: ${l.subject} | ห้อง: ${l.grade_level}/${l.classroom} | หัวข้อ: ${l.topic || "ไม่ระบุ"} | Activity: ${toActivityLabel(l.activity_mode)} | Mastery: ${l.mastery_score}/5 | Gap: ${l.major_gap} | Remedial: ${remedialCount}/${total} | Strategy: ${l.next_strategy || "ไม่ระบุ"} | Issue: ${l.key_issue || "ไม่ระบุ"}`;
    })
    .join("\n");

  const guardNote = `\n\n[GUARD RULES — enforce ทุกคำตอบ]\n- REF ที่ถูกต้องในการสนทนานี้: ${refList} (ใช้ได้เฉพาะรายการนี้เท่านั้น)\n- ห้ามสร้าง REF รูปแบบอื่น เช่น [REF-19ก.พ.] หรือ [REF-ชื่อเรื่อง]\n- Special Care IDs ที่พบใน context: ${hasHealthCareIds ? extractedHealthCareIds.join(", ") : "ไม่มี"}\n- Remedial IDs ที่พบใน context: ${hasRemedialIds ? extractedRemedialIds.join(", ") : "ไม่มี"}\n- total_students ใน context: ${hasTotalStudents ? "มี" : "ไม่มี — ห้ามสร้างตัวเลข X/Y หรือ %"}\n- ห้ามสร้าง student ID ขึ้นเองเด็ดขาด ถ้าไม่มี ID ใน context ให้ตอบว่า "ไม่พบรหัสนักเรียนในข้อมูล"`;

  const baseContext = `## ข้อมูลการสอนที่กรองแล้ว (${logs.length} คาบ)\nMastery เฉลี่ย: ${avgMastery}/5\n\n### รายละเอียด (ใช้ [REF-X] อ้างอิงเสมอ):\n${sessionDetails}${guardNote}`;

  // Pre-compute strategy effectiveness: slice[i].next_strategy → slice[i+1].mastery_score
  const strategyMap = new Map<string, number[]>();
  for (let i = 0; i < slice.length - 1; i++) {
    const strat = slice[i].next_strategy;
    if (!strat || strat === "ไม่ระบุ") continue;
    const nextMastery = slice[i + 1].mastery_score;
    if (!strategyMap.has(strat)) strategyMap.set(strat, []);
    strategyMap.get(strat)!.push(nextMastery);
  }
  const isLowerPrimary = /ป\.?[12](\b|\/)/.test(filters.gradeLevel || "");
  let strategySummary = "\n\n[STRATEGY OUTCOME SUMMARY]\n(คำนวณจากข้อมูลจริงใน context — ใช้แทนการวิเคราะห์ cross-REF)\n";
  if (isLowerPrimary) {
    strategySummary += "⚠️ ป.1–ป.2 OVERRIDE: ข้อมูลนี้ใช้สังเกตผลลัพธ์เท่านั้น แม้ Peer Tutor จะมีค่าเฉลี่ยสูง ห้ามแนะนำเป็น primary strategy สำหรับทักษะพื้นฐาน — ยึด [CLASSROOM APPROPRIATENESS] ก่อนเสมอ\n";
  }
  if (strategyMap.size === 0) {
    strategySummary += "ไม่มีข้อมูล strategy ที่มีผลลัพธ์ติดตาม";
  } else {
    for (const [strat, scores] of strategyMap) {
      const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      strategySummary += `${strat}: ใช้ ${scores.length} ครั้ง → Mastery คาบถัดไป: ${scores.join(",")} → เฉลี่ย ${avg}\n`;
    }
  }

  // Pre-compute gap distribution
  const gapCount = new Map<string, number>();
  for (const log of slice) {
    const gap = log.major_gap;
    if (!gap) continue;
    gapCount.set(gap, (gapCount.get(gap) ?? 0) + 1);
  }
  let gapSummary = "\n\n[GAP DISTRIBUTION]\n(นับจาก context จริง — ใช้วิเคราะห์ pattern ก่อนแนะนำ)\n";
  if (gapCount.size === 0) {
    gapSummary += "ไม่มีข้อมูล Gap";
  } else {
    const total = slice.length;
    for (const [gap, count] of gapCount) {
      const pct = ((count / total) * 100).toFixed(0);
      gapSummary += `${gap}-Gap: ${count} คาบ (${pct}%)\n`;
    }
  }

  const scopeAssertion = filters.subject
    ? `\n\n## [CRITICAL - ANSWER SCOPE]\nตอบเฉพาะวิชา: ${filters.subject} เท่านั้น\nห้ามกล่าวถึง วิชาอื่นที่ไม่ตรงกับตัวกรองนี้เด็ดขาด`
    : `\n\n## [CRITICAL - ANSWER SCOPE]\nตอบได้เฉพาะข้อมูลที่อยู่ใน [REF-X] เท่านั้น (ตามตัวกรองที่เลือก)`;

  const filterInfo = `\n\n## [ACTIVE FILTER]\nวิชา: ${filters.subject || "ทั้งหมด"}\nระดับชั้น: ${filters.gradeLevel || "ทั้งหมด"}\nห้อง: ${filters.classroom || "ทั้งหมด"}\n⚠️ AI ต้องตอบเฉพาะข้อมูลที่อยู่ใน [REF-X] เท่านั้น ห้ามนำข้อมูลวิชาอื่นมาปน`;

  return baseContext + strategySummary + gapSummary + scopeAssertion + filterInfo;
}

export default function Executive() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ExecFilters>({ dateFrom: "", dateTo: "", gradeLevel: "", classroom: "", subject: "", teacherName: "", academicTerm: "" });
  const [barGroupBy, setBarGroupBy] = useState<"grade" | "subject">("grade");
  const { diagnosticEvents, strikes, isLoading: diagLoading } = useDiagnosticData();
  const [adminChatOpen, setAdminChatOpen] = useState(false);

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

  // Build academic term list from logs
  const academicTerms = useMemo(() => {
    return [...new Set(allLogs.map((l) => l.academic_term).filter(Boolean) as string[])].sort().reverse();
  }, [allLogs]);

  // Build teacher name list from teacher_name field in logs (not from profiles)
  const teacherNames = useMemo(() => {
    let base = allLogs;
    if (filters.gradeLevel) base = base.filter((l) => l.grade_level === filters.gradeLevel);
    if (filters.classroom) base = base.filter((l) => String(l.classroom ?? "") === String(filters.classroom ?? ""));
    if (filters.subject) base = base.filter((l) => l.subject === filters.subject);
    return [...new Set(base.map((l) => l.teacher_name).filter(Boolean) as string[])].sort();
  }, [allLogs, filters.gradeLevel, filters.classroom, filters.subject]);

  useEffect(() => {
    if (filters.teacherName && !teacherNames.includes(filters.teacherName)) {
      setFilters((prev) => ({ ...prev, teacherName: "" }));
    }
  }, [filters.teacherName, teacherNames]);

  // Apply filters to logs — use teacher_name directly
  const filteredLogs = useMemo(() => {
    return allLogs.filter((l) => {
      if (filters.dateFrom && l.teaching_date < filters.dateFrom) return false;
      if (filters.dateTo && l.teaching_date > filters.dateTo) return false;
      if (filters.gradeLevel && l.grade_level !== filters.gradeLevel) return false;
      if (filters.classroom && String(l.classroom ?? "") !== String(filters.classroom ?? "")) return false;
      if (filters.subject && l.subject !== filters.subject) return false;
      if (filters.teacherName && l.teacher_name !== filters.teacherName) return false;
      if (filters.academicTerm && l.academic_term !== filters.academicTerm) return false;
      return true;
    });
  }, [allLogs, filters]);

  const filteredLogIds = useMemo(() => new Set(filteredLogs.map((l) => l.id)), [filteredLogs]);

  const adminChatContext = useMemo(() => buildExecutiveChatContext(filteredLogs, filters), [filteredLogs, filters]);
  const execFilterKey = useMemo(
    () =>
      `${filters.dateFrom}|${filters.dateTo}|${filters.gradeLevel}|${filters.classroom}|${filters.subject}|${filters.teacherName}|${filters.academicTerm}`,
    [filters]
  );

  // Filter diagnosticEvents by main filters (match sessions in filteredLogs)
  const filteredDiagnosticEvents = useMemo(() => {
    return diagnosticEvents.filter((e) => {
      if (!filteredLogIds.has(e.teaching_log_id)) return false;
      if (filters.subject && e.subject !== filters.subject) return false;
      if (filters.gradeLevel && e.grade_level !== filters.gradeLevel) return false;
      if (filters.classroom && String(e.classroom ?? "") !== String(filters.classroom ?? "")) return false;
      return true;
    });
  }, [diagnosticEvents, filteredLogIds, filters.subject, filters.gradeLevel, filters.classroom]);

  // Filter strikes by subject, teacher, and grade/room (via scope_id for class-level strikes)
  const filteredStrikes = useMemo(() => {
    return strikes.filter((s) => {
      if (filters.subject && s.subject !== filters.subject) return false;
      if (filters.teacherName) {
        // Match strike's teacher via logs that are already filtered
        const logIds = new Set(filteredLogs.map((l) => l.id));
        if (s.last_session_id && !logIds.has(s.last_session_id)) return false;
      }
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
  }, [strikes, filters.subject, filters.gradeLevel, filters.classroom, filters.teacherName, filteredLogs]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">ภาพรวมผู้บริหาร</h1>

        {/* Admin chat: side-sheet Q&A (Phase 1 UI-only; context builder comes in Phase 2) */}
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => setAdminChatOpen(true)}>
            แชทถามผู้บริหาร
          </Button>
        </div>
        {/* Remount to reset Q&A when filters change (prevents scope drift). */}
        <ChatSidebar
          key={execFilterKey}
          open={adminChatOpen}
          onOpenChange={setAdminChatOpen}
          context={adminChatContext}
          audience="executive"
        />

        <ExecutiveFilters
          filters={filters}
          onChange={setFilters}
          gradeLevels={gradeLevels}
          classrooms={classrooms}
          subjects={subjects}
          teacherNames={teacherNames}
          academicTerms={academicTerms}
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
        {diagLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-6">
            <ReferralQueue events={filteredDiagnosticEvents} logs={filteredLogs} />
            <StrikeEscalationView strikes={filteredStrikes} />
            <SystemGapReport events={filteredDiagnosticEvents} logs={filteredLogs} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
