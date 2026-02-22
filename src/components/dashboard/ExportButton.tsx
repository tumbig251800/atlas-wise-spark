import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanClassroomData } from "@/lib/utils";
import type { TeachingLog } from "@/hooks/useDashboardData";

interface ExportButtonProps {
  logs: TeachingLog[];
}

const safe = (val: any, fallback = "[N/A]"): string => {
  if (val === null || val === undefined || String(val).trim() === "") return fallback;
  return String(val);
};

export function ExportButton({ logs }: ExportButtonProps) {
  const exportCSV = () => {
    if (logs.length === 0) return;

    const headers = [
      "วันที่สอน",
      "ระดับชั้น",
      "ห้องเรียน",
      "จำนวนนักเรียน",
      "วิชา",
      "หน่วยการเรียนรู้",
      "เรื่องที่สอน",
      "Mastery Score",
      "Activity Mode",
      "Key Issue",
      "Major Gap",
      "Classroom Management",
      "Health Care Status",
      "Health Care IDs",
      "Remedial IDs",
      "Next Strategy",
      "สะท้อนคิด",
      "วันที่บันทึก",
    ];

    const rows = logs.map((l) => [
      l.teaching_date,
      l.grade_level,
      cleanClassroomData(l.classroom),
      safe(l.total_students != null ? String(l.total_students) : "", "[N/A]"),
      l.subject,
      safe(l.learning_unit),
      safe(l.topic),
      l.mastery_score,
      l.activity_mode,
      safe(l.key_issue),
      l.major_gap,
      safe(l.classroom_management),
      l.health_care_status ? "มี" : "ไม่มี",
      safe(l.health_care_ids, "[None]"),
      safe(l.remedial_ids),
      safe(l.next_strategy),
      safe(l.reflection),
      l.created_at,
    ]);

    const BOM = "\uFEFF";
    const csv = BOM + [headers.join(","), ...rows.map((r) =>
      r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atlas-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportCSV}
      disabled={logs.length === 0}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
