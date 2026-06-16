import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import type { ActionItem } from "@/hooks/useActionItems";

interface StudentRow {
  item: ActionItem;
  studentId: string;
  studentName: string;
  unit: string;
  score: string;
  totalScore: string;
  pct: number;
}

function parseDetail(item: ActionItem): Omit<StudentRow, "item"> {
  const detail = item.detail ?? "";
  const idMatch = detail.match(/นักเรียน ID (\S+) \((.+?)\)/);
  const scoreMatch = detail.match(/คะแนนรวม:\s*(\d+)\/(\d+)/);
  const unitMatch = detail.match(/หน่วยที่\s*\d+/);
  return {
    studentId: idMatch?.[1] ?? "—",
    studentName: idMatch?.[2] ?? "—",
    unit: unitMatch?.[0] ?? "—",
    score: scoreMatch?.[1] ?? "—",
    totalScore: scoreMatch?.[2] ?? "—",
    pct: Number(item.metric_value ?? 0),
  };
}

function pctColor(pct: number) {
  if (pct < 50) return "text-red-600 font-bold";
  if (pct < 70) return "text-orange-500 font-semibold";
  return "text-yellow-600";
}

interface Props {
  items: ActionItem[];
  onResolve?: (item: ActionItem) => void;
  onDismiss?: (item: ActionItem) => void;
}

export function UnitBlindSpotStudentList({ items, onResolve, onDismiss }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const rows: StudentRow[] = items.map((item) => ({
    item,
    ...parseDetail(item),
  }));

  // group by unit (usually all same unit, but handle edge case)
  const units = [...new Set(rows.map((r) => r.unit))];

  return (
    <div className="overflow-x-auto">
      {units.map((unit) => {
        const unitRows = rows.filter((r) => r.unit === unit);
        return (
          <div key={unit} className="mb-2">
            <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 border-b border-indigo-100">
              {unit} — นักเรียนต่ำกว่าเกณฑ์ {unitRows.length} คน
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left px-3 py-2 w-8">#</th>
                  <th className="text-left px-3 py-2">รหัสนักเรียน</th>
                  <th className="text-left px-3 py-2">ชื่อ-นามสกุล</th>
                  <th className="text-center px-3 py-2">คะแนน</th>
                  <th className="text-center px-3 py-2">%</th>
                  <th className="text-center px-3 py-2">สถานะ</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {unitRows.map((row, idx) => {
                  const isExpanded = expandedId === row.item.id;
                  const isClosed = row.item.status === "verified" || row.item.status === "dismissed";
                  return (
                    <>
                      <tr
                        key={row.item.id}
                        className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${isClosed ? "opacity-50" : ""}`}
                        onClick={() => setExpandedId(isExpanded ? null : row.item.id)}
                      >
                        <td className="px-3 py-2 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs">{row.studentId}</td>
                        <td className="px-3 py-2 font-medium">{row.studentName}</td>
                        <td className="px-3 py-2 text-center text-xs">
                          {row.score}/{row.totalScore}
                        </td>
                        <td className={`px-3 py-2 text-center text-sm ${pctColor(row.pct)}`}>
                          {row.pct}%
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isClosed ? (
                            <span className="text-xs text-muted-foreground">ปิดแล้ว</span>
                          ) : (
                            <span className="text-xs text-orange-600">ค้างอยู่</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isExpanded
                            ? <ChevronDown className="h-3 w-3 text-muted-foreground inline" />
                            : <ChevronRight className="h-3 w-3 text-muted-foreground inline" />}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${row.item.id}-detail`} className="bg-indigo-50/40">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="space-y-2">
                              {row.item.detail && (
                                <div className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                                  {row.item.detail}
                                </div>
                              )}
                              {!isClosed && (onResolve || onDismiss) && (
                                <div className="flex gap-2 pt-1">
                                  {onResolve && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                      onClick={(e) => { e.stopPropagation(); onResolve(row.item); }}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      ครูแก้แล้ว
                                    </Button>
                                  )}
                                  {onDismiss && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                      onClick={(e) => { e.stopPropagation(); onDismiss(row.item); }}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      ปิดเคส
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
