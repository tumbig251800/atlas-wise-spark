import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import type { SmartReport } from "@/types/smartReport";

interface Props {
  report: SmartReport;
}

function riskVariant(r: string) {
  if (r === "high") return "destructive";
  if (r === "medium") return "secondary";
  return "outline";
}

function riskLabel(r: string) {
  if (r === "high") return "สูง";
  if (r === "medium") return "กลาง";
  return "ต่ำ";
}

export function StudentRiskList({ report }: Props) {
  const risks = report.studentRisks.filter((r) => r.risk !== "low");

  if (risks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            นักเรียนเสี่ยง
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">ไม่พบนักเรียนที่มีความเสี่ยง</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          นักเรียนเสี่ยง ({risks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="space-y-2 pr-4">
            {risks.map((r) => (
              <div
                key={`${r.studentId}-${r.unitKey}`}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{r.studentName || r.studentId}</span>
                  <span className="text-muted-foreground ml-2">
                    {r.unitKey} · ซ่อมเสริม {r.remedialCount} ครั้ง
                    {r.scorePct != null ? ` · คะแนน ${r.scorePct.toFixed(0)}%` : ""}
                  </span>
                </div>
                <Badge variant={riskVariant(r.risk)}>{riskLabel(r.risk)}</Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
