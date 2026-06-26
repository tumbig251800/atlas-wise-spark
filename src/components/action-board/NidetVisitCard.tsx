import { Button } from "@/components/ui/button";
import { Pencil, ClipboardCheck, FileText } from "lucide-react";
import { RUBRIC_DIMENSIONS, type NidetVisit } from "@/types/nidet";
import type { ActionItem } from "@/hooks/useActionItems";
import { downloadNidetDocx } from "@/lib/downloadNidetDocx";

interface Props {
  visit: NidetVisit;
  item: ActionItem;
  /** Omit to render download-only (e.g. teacher view — teachers cannot edit นิเทศ). */
  onEdit?: () => void;
}

function formatThaiDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function NidetVisitCard({ visit, item, onEdit }: Props) {
  const scored = RUBRIC_DIMENSIONS.filter((d) => visit[d.key] != null);

  const rows: Array<{ label: string; value: string }> = [
    { label: "จุดเด่น", value: visit.strengths },
    { label: "จุดพัฒนา", value: visit.improvements },
    { label: "ข้อเสนอ", value: visit.recommendations },
  ].filter((r) => r.value && r.value.trim().length > 0);

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-sky-900">
          <ClipboardCheck className="h-4 w-4" />
          บันทึกนิเทศ — {formatThaiDate(visit.visit_date)}
        </div>
        <span className="text-xs text-sky-700">{visit.supervisor_name || "—"}</span>
      </div>

      {rows.length > 0 && (
        <div className="space-y-0.5">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-2">
              <span className="text-xs text-sky-700 shrink-0 w-16">{r.label}</span>
              <span className="text-sky-900 truncate">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {scored.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-sky-700">มิติที่มีคะแนน:</span>
          {scored.map((d) => (
            <span
              key={d.key}
              className="text-[11px] bg-sky-100 text-sky-800 border border-sky-200 rounded px-1.5 py-0.5"
              title={d.label}
            >
              {d.label} {visit[d.key]}/4
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-sky-700">
          นัดติดตาม: {formatThaiDate(visit.follow_up_date)}
          {visit.follow_up_method ? ` · ${visit.follow_up_method}` : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-sky-300 text-sky-800 hover:bg-sky-100"
            onClick={(e) => {
              e.stopPropagation();
              void downloadNidetDocx(visit, item);
            }}
          >
            <FileText className="h-3 w-3 mr-1" /> ออกเอกสาร .doc
          </Button>
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-sky-300 text-sky-800 hover:bg-sky-100"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-3 w-3 mr-1" /> แก้ไข
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
