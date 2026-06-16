import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, FileText, TrendingDown, AlertTriangle } from "lucide-react";
import type { PlcQueueGroup } from "@/hooks/usePlcQueue";

interface PlcQueueCardProps {
  group: PlcQueueGroup;
  onAiDraft: (group: PlcQueueGroup) => void;
  isLoading?: boolean;
}

const ISSUE_TYPE_LABELS: Record<string, string> = {
  RedZone: "🚨 Red Zone",
  MasteryDrop: "📉 Mastery Drop",
  UnitBlindSpot: "👁️ Unit Blind Spot",
};

const ISSUE_TYPE_COLORS: Record<string, string> = {
  RedZone: "bg-red-50 text-red-700 border-red-200",
  MasteryDrop: "bg-orange-50 text-orange-700 border-orange-200",
  UnitBlindSpot: "bg-blue-50 text-blue-700 border-blue-200",
};

export function PlcQueueCard({ group, onAiDraft, isLoading }: PlcQueueCardProps) {
  const issueTypeLabel = ISSUE_TYPE_LABELS[group.dominantType] ?? group.dominantType;
  const cardColor = ISSUE_TYPE_COLORS[group.dominantType] ?? "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <Card className={`border-2 ${cardColor} hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>{group.subject}</span>
              <Badge variant="outline" className="text-xs">
                {group.gradeBand}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 text-sm">
              {issueTypeLabel} · {group.items.length} รายการ
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{group.priority}</div>
            <div className="text-xs text-muted-foreground">Priority</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Teachers */}
        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-sm">
            <span className="font-medium">ครูที่เกี่ยวข้อง:</span>{" "}
            <span className="text-muted-foreground">
              {group.teacherNames.length > 0
                ? group.teacherNames.join(", ")
                : "ไม่ระบุ"}
            </span>
          </div>
        </div>

        {/* Average Metric */}
        {group.averageMetric !== null && (
          <div className="flex items-start gap-2">
            <TrendingDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="text-sm">
              <span className="font-medium">ค่าเฉลี่ย:</span>{" "}
              <span className="text-muted-foreground">
                {group.averageMetric.toFixed(1)}
                {group.dominantType === "UnitBlindSpot" && "%"}
              </span>
            </div>
          </div>
        )}

        {/* Items Summary */}
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-sm">
            <span className="font-medium">ครอบคลุม:</span>{" "}
            <span className="text-muted-foreground">
              {group.items.length} รายการจาก {group.teacherNames.length} ครู
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          className="w-full mt-2"
          variant="default"
          size="sm"
          onClick={() => onAiDraft(group)}
          disabled={isLoading}
        >
          <Sparkles className={`h-4 w-4 mr-2 ${isLoading ? "animate-pulse" : ""}`} />
          {isLoading ? "กำลังสร้าง Draft..." : "AI Draft + จัด PLC"}
        </Button>
      </CardContent>
    </Card>
  );
}
