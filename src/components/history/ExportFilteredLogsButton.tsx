import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type TeachingLog = Tables<"teaching_logs">;

interface ExportFilteredLogsButtonProps {
  logs: TeachingLog[];
  teacherName?: string;
  filters?: {
    academicTerm?: string;
    subject?: string;
    gradeLevel?: string;
    classroom?: string;
  };
}

export function ExportFilteredLogsButton({
  logs,
  teacherName,
  filters = {},
}: ExportFilteredLogsButtonProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (logs.length === 0) {
      toast({
        title: "ไม่มีข้อมูล",
        description: "ไม่พบบันทึกการสอนที่ต้องการ export",
        variant: "destructive",
      });
      return;
    }

    try {
      const content = generateTextFile(logs, teacherName, filters);

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `atlas-teaching-logs-${teacherName || "all"}-${new Date().toISOString().split("T")[0]}.txt`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export สำเร็จ",
        description: `ดาวน์โหลดบันทึก ${logs.length} รายการแล้ว`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถ export ข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  const generateTextFile = (
    logs: TeachingLog[],
    teacher?: string,
    filters: any = {}
  ): string => {
    let content = "ATLAS - บันทึกหลังสอนของฉัน\n";
    content += `ผู้ใช้: ${teacher || "ไม่ระบุ"}\n`;
    content += `จำนวนรายการ: ${logs.length}\n`;

    // Date range
    if (logs.length > 0) {
      const dates = logs.map((l) => l.teaching_date).sort();
      content += `ช่วงวันที่: ${formatThaiDate(dates[0])} ถึง ${formatThaiDate(dates[dates.length - 1])}\n`;
    }

    content += `\n`;

    // Filters applied
    if (Object.keys(filters).some((k) => filters[k])) {
      content += `ตัวกรอง:\n`;
      if (filters.academicTerm) content += `  ภาคเรียน: ${filters.academicTerm}\n`;
      if (filters.subject) content += `  วิชา: ${filters.subject}\n`;
      if (filters.gradeLevel) content += `  ระดับชั้น: ${filters.gradeLevel}\n`;
      if (filters.classroom) content += `  ห้อง: ${filters.classroom}\n`;
      content += `\n`;
    }

    // Logs
    logs.forEach((log, index) => {
      content += `รายการที่ ${index + 1}\n`;
      content += `วันที่สอน: ${formatThaiDate(log.teaching_date)}\n`;
      content += `วิชา: ${log.subject || "-"}\n`;
      content += `ระดับชั้น/ห้อง: ${log.grade_level} / ${log.classroom}\n`;
      content += `หน่วยการเรียนรู้: ${log.unit_name || "-"}\n`;
      content += `หัวข้อ: ${log.topic || "-"}\n`;
      content += `จำนวนนักเรียน: ${log.student_count || "-"}\n`;
      content += `Mastery: ${log.mastery_score || "-"}/5\n`;
      content += `Gap: ${capitalizeGap(log.major_gap)}\n`;
      content += `รูปแบบกิจกรรม: ${formatActivityLevel(log.activity_level)}\n`;
      content += `Key Issue: ${log.key_issue || "-"}\n`;
      content += `Next Strategy: ${log.next_strategy || "-"}\n`;
      content += `Reflection: ${log.reflection || "-"}\n`;
      if (log.health_care_status) {
        content += `🏥 SC Status: ${log.health_care_status}\n`;
      }
      content += `\n------------------------------\n`;
    });

    return content;
  };

  const formatThaiDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const capitalizeGap = (gap: string) => {
    const map: Record<string, string> = {
      success: "Success",
      "k-gap": "K-Gap",
      "p-gap": "P-Gap",
      "a-gap": "A-Gap",
      "a2-gap": "A2-Gap",
      "system-gap": "System-Gap",
    };
    return map[gap] || gap;
  };

  const formatActivityLevel = (level: string) => {
    const map: Record<string, string> = {
      passive: "Passive (Level 1)",
      active: "Active (Level 2)",
      constructive: "Constructive (Level 3)",
    };
    return map[level] || level;
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}>
      <Download className="w-4 h-4 mr-2" />
      Export ({logs.length})
    </Button>
  );
}
