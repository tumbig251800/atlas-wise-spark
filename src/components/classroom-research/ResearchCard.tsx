import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { StatusBadge, IssueTypeBadge } from "./StatusBadge";
import type { ClassroomResearchSuggestion } from "@/types/classroomResearch";

/**
 * after_data เป็น jsonb ที่ใส่อะไรก็ได้ จึงเช็กแค่ != null ไม่พอ
 * "พร้อมเขียน" = มีผลวัด Endline จริง ซึ่งต้องมีทั้ง metric และ captured_at
 */
function hasEndlineData(afterData: unknown): boolean {
  if (afterData == null || typeof afterData !== "object" || Array.isArray(afterData)) {
    return false;
  }
  const d = afterData as Record<string, unknown>;
  return typeof d.metric === "string" && d.metric !== ""
      && typeof d.captured_at === "string" && d.captured_at !== "";
}

interface Props {
  research: ClassroomResearchSuggestion;
  showTeacherName?: boolean;
  /** Count of teaching_logs linked to this research. Undefined while still loading. */
  logCount?: number;
  onViewDetail: (research: ClassroomResearchSuggestion) => void;
}

export function ResearchCard({ research, showTeacherName = false, logCount, onViewDetail }: Props) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-foreground text-base sm:text-lg leading-tight">
          {research.research_title}
        </h3>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <IssueTypeBadge issueType={research.issue_type} />
          <StatusBadge status={research.status} />
        </div>

        {/* Context */}
        <div className="text-sm text-muted-foreground space-y-1">
          {showTeacherName && research.teacher_name && (
            <div className="font-medium text-foreground">
              👤 {research.teacher_name}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            <span>{research.grade_level}/{research.classroom}</span>
            <span>·</span>
            <span>{research.subject}</span>
          </div>
          {logCount !== undefined && (
            <div>📝 บันทึกแล้ว {logCount} คาบ</div>
          )}
          {research.status !== "abandoned" && hasEndlineData(research.after_data) && (
            <div className="text-green-700 font-medium">✅ พร้อมเขียน</div>
          )}
        </div>

        {/* Detected Problem */}
        {research.issue_type === "AbandonedRepropose" ? (
          <div className="rounded-md border-l-2 border-slate-300 bg-muted/50 px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground mb-0.5">
              ↻ เสนอแทนหัวข้อเดิมที่ยกเลิกไป
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {research.detected_problem}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {research.detected_problem}
          </p>
        )}

        {/* View Detail Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetail(research)}
            className="w-full sm:w-auto"
          >
            <Eye className="h-4 w-4 mr-1" />
            ดูรายละเอียด
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
