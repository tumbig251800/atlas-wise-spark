import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SmartReport } from "@/types/smartReport";

interface Props {
  report: SmartReport;
}

function verdictVariant(v: string) {
  if (v === "aligned") return "default";
  if (v === "overperformed") return "secondary";
  return "destructive";
}

function verdictLabel(v: string) {
  if (v === "aligned") return "สอดคล้อง";
  if (v === "overperformed") return "ดีขึ้น";
  return "ต้องดูแล";
}

export function UnitReportTable({ report }: Props) {
  const { gapValidations, unitTeaching, unitAssessments } = report;
  const teachingMap = new Map(unitTeaching.map((u) => [u.unitKey, u]));
  const assessmentMap = new Map(unitAssessments.map((a) => [a.unitKey, a]));

  if (gapValidations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        ไม่พบข้อมูลหน่วยการเรียนรู้ — กรุณาเลือกตัวกรอง
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>หน่วย</TableHead>
            <TableHead>Gap หลัก</TableHead>
            <TableHead>Mastery เฉลี่ย</TableHead>
            <TableHead>คะแนนสอบเฉลี่ย</TableHead>
            <TableHead>Verdict</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gapValidations.map((g) => {
            const t = teachingMap.get(g.unitKey);
            const a = assessmentMap.get(g.unitKey);
            return (
              <TableRow key={g.unitKey}>
                <TableCell className="font-medium">{g.displayName}</TableCell>
                <TableCell>{g.teachingGap}</TableCell>
                <TableCell>
                  {t ? `${t.avgMastery.toFixed(1)}/5` : "—"}
                </TableCell>
                <TableCell>
                  {g.assessmentAvgPct != null
                    ? `${g.assessmentAvgPct.toFixed(1)}%`
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={verdictVariant(g.verdict)}>
                    {verdictLabel(g.verdict)}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
