import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatFloatingButton } from "@/components/chat/ChatFloatingButton";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { useDashboardData, loadPersistedFilters } from "@/hooks/useDashboardData";
import { useDiagnosticData } from "@/hooks/useDiagnosticData";
import { buildLogsSummary } from "@/components/dashboard/ExecutiveSummary";

const pageNameMap: Record<string, string> = {
  "/dashboard": "Dashboard (หน้าวิเคราะห์ข้อมูลครู)",
  "/executive": "Executive (หน้าภาพรวมผู้บริหาร)",
  "/log": "Teaching Log (หน้าบันทึกหลังสอน)",
  "/consultant": "AI Consultant (หน้าที่ปรึกษา AI)",
  "/history": "History (ประวัติการบันทึก)",
  "/lesson-plan": "Lesson Plan (แผนการสอน)",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const location = useLocation();
  const { allLogs } = useDashboardData(loadPersistedFilters());
  const { colorCounts, activeStrikes } = useDiagnosticData();

  const chatContext = useMemo(() => {
    const summary = buildLogsSummary(allLogs, colorCounts, activeStrikes.length);
    const currentPage = pageNameMap[location.pathname] || location.pathname;
    return `${summary}\nหน้าปัจจุบัน: ${currentPage}`;
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
