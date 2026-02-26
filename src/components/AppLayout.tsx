import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatFloatingButton } from "@/components/chat/ChatFloatingButton";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useDashboardData, loadPersistedFilters, type TeachingLog } from "@/hooks/useDashboardData";
import { useDiagnosticData, type DiagnosticColorCounts } from "@/hooks/useDiagnosticData";

const pageNameMap: Record<string, string> = {
  "/dashboard": "Dashboard (หน้าวิเคราะห์ข้อมูลครู)",
  "/executive": "Executive (หน้าภาพรวมผู้บริหาร)",
  "/log": "Teaching Log (หน้าบันทึกหลังสอน)",
  "/consultant": "AI Consultant (หน้าที่ปรึกษา AI)",
  "/history": "History (ประวัติการบันทึก)",
  "/lesson-plan": "Lesson Plan (แผนการสอน)",
};

/** Build chat context with [REF-X] citations for strict AI system prompt compliance */
function buildChatContext(
  allLogs: TeachingLog[],
  colorCounts: DiagnosticColorCounts,
  activeStrikeCount: number,
  currentPage: string,
): string {
  // Take up to 20 most recent logs (sorted newest first for REF ordering)
  const recentLogs = [...allLogs]
    .sort((a, b) => b.teaching_date.localeCompare(a.teaching_date))
    .slice(0, 20);

  if (recentLogs.length === 0) {
    return `## ข้อมูลการสอน\nไม่พบข้อมูลการสอนในระบบ\n\nหน้าปัจจุบัน: ${currentPage}`;
  }

  const avgMastery = (recentLogs.reduce((s, l) => s + l.mastery_score, 0) / recentLogs.length).toFixed(1);

  // Build [REF-X] lines
  const refLines = recentLogs.map((l, i) => {
    const remedialIds = l.remedial_ids || "-";
    const total = l.total_students ?? "?";
    const remedialCount = l.remedial_ids ? l.remedial_ids.split(",").filter(Boolean).length : 0;
    const remedialPct = l.total_students && l.total_students > 0
      ? `${((remedialCount / l.total_students) * 100).toFixed(1)}%`
      : "-";
    return `[REF-${i + 1}] วันที่: ${l.teaching_date} | วิชา: ${l.subject} | ระดับชั้น: ${l.grade_level} | ห้อง: ${l.classroom} | หัวข้อ: ${l.topic || "-"} | Mastery: ${l.mastery_score}/5 | Gap: ${l.major_gap} | Remedial: ${remedialCount}/${total} (${remedialPct}) [${remedialIds}] | Issue: ${l.key_issue || "-"} | Strategy: ${l.next_strategy || "-"}`;
  });

  // Gap summary
  const gapCounts: Record<string, number> = {};
  recentLogs.forEach((l) => {
    gapCounts[l.major_gap] = (gapCounts[l.major_gap] || 0) + 1;
  });
  const gapSummary = Object.entries(gapCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([g, c]) => `${g} (${c} คาบ)`)
    .join(", ");

  return `## ข้อมูลการสอนทั้งหมด (${recentLogs.length} คาบ)
Mastery เฉลี่ย: ${avgMastery}/5

### รายละเอียด (ใช้ [REF-X] อ้างอิงเสมอ):
${refLines.join("\n")}

Gap หลัก: ${gapSummary}
Diagnostic: RED=${colorCounts.red} ORANGE=${colorCounts.orange} YELLOW=${colorCounts.yellow} BLUE=${colorCounts.blue} GREEN=${colorCounts.green}
Active Strikes (≥2): ${activeStrikeCount} รายการ

## [ACTIVE FILTER]
วิชา: ทั้งหมด
ระดับชั้น: ทั้งหมด
ห้อง: ทั้งหมด

## [ANSWER SCOPE]
ตอบได้ทุกวิชาและทุกห้องที่มีใน [REF-X] — แต่ต้องอ้างอิงเฉพาะ REF ที่ตรงกับคำถามของผู้ใช้

หน้าปัจจุบัน: ${currentPage}`;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const location = useLocation();
  const { allLogs } = useDashboardData(loadPersistedFilters());
  const { colorCounts, activeStrikes } = useDiagnosticData();

  const chatContext = useMemo(() => {
    const currentPage = pageNameMap[location.pathname] || location.pathname;
    return buildChatContext(allLogs, colorCounts, activeStrikes.length, currentPage);
  }, [allLogs, colorCounts, activeStrikes, location.pathname]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <SidebarTrigger />
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
      <ChatFloatingButton onClick={() => setChatOpen(true)} />
      <ChatSidebar open={chatOpen} onOpenChange={setChatOpen} context={chatContext} />
    </SidebarProvider>
  );
}
