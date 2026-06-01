import { useState } from "react";
import { AlertCircle, AlertTriangle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import type { ValidationMessage } from "@/hooks/useTeachingLogValidation";

interface Props {
  warnings: ValidationMessage[];
  errors: ValidationMessage[];
  lateByDays: number;
}

export function ValidationBanner({ warnings, errors, lateByDays }: Props) {
  const [showWarnings, setShowWarnings] = useState(true);

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const isLate = lateByDays > 2;

  if (!hasErrors && !hasWarnings && !isLate) return null;

  return (
    <div className="space-y-2">
      {/* Errors — block submit */}
      {hasErrors && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3">
          <div className="flex items-center gap-2 font-medium text-red-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            กรุณาแก้ไขก่อนบันทึก
          </div>
          <ul className="mt-1.5 space-y-1 pl-6 list-disc text-sm text-red-800">
            {errors.map((e, i) => (
              <li key={`${e.field}-${i}`}>
                {e.message}
                {e.flag_code && (
                  <span className="ml-1 text-[11px] text-red-600">({e.flag_code})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings — collapsible, allow submit */}
      {hasWarnings && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <button
            type="button"
            onClick={() => setShowWarnings((s) => !s)}
            className="flex w-full items-center justify-between gap-2 font-medium text-amber-900"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              พบข้อมูลที่ควรตรวจสอบ ({warnings.length})
            </span>
            {showWarnings ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>
          {showWarnings && (
            <ul className="mt-1.5 space-y-1 pl-6 list-disc text-sm text-amber-800">
              {warnings.map((w, i) => (
                <li key={`${w.field}-${i}`}>
                  {w.message}
                  {w.flag_code && (
                    <span className="ml-1 text-[11px] text-amber-600">({w.flag_code})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Late submission — informational */}
      {isLate && (
        <div className="rounded-md border border-blue-300 bg-blue-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
            <Clock className="h-4 w-4 shrink-0" />
            บันทึกล่าช้า {lateByDays} วัน
          </div>
        </div>
      )}
    </div>
  );
}
