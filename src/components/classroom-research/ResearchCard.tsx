import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { StatusBadge, IssueTypeBadge } from "./StatusBadge";
import type { ClassroomResearchSuggestion } from "@/types/classroomResearch";

interface Props {
  research: ClassroomResearchSuggestion;
  showTeacherName?: boolean;
  onViewDetail: (research: ClassroomResearchSuggestion) => void;
}

export function ResearchCard({ research, showTeacherName = false, onViewDetail }: Props) {
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
        </div>

        {/* Detected Problem */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {research.detected_problem}
        </p>

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
