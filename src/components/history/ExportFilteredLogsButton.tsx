import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { downloadTeachingLogsDocx } from "@/lib/downloadTeachingLogsDocx";

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
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (logs.length === 0) {
      toast({
        title: "ไม่มีข้อมูล",
        description: "ไม่พบบันทึกการสอนที่ต้องการ export",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const filterLines: string[] = [];
      if (filters.academicTerm) filterLines.push(`ภาคเรียน : ${filters.academicTerm}`);
      if (filters.subject) filterLines.push(`วิชา : ${filters.subject}`);
      if (filters.gradeLevel) filterLines.push(`ระดับชั้น : ${filters.gradeLevel}`);
      if (filters.classroom) filterLines.push(`ห้อง : ${filters.classroom}`);

      await downloadTeachingLogsDocx(logs, {
        ownerLabel: teacherName || "ไม่ระบุ",
        filterLines,
        filenameHint: teacherName,
      });

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0 || loading}>
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
      Export Word ({logs.length})
    </Button>
  );
}
