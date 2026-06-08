/**
 * UnitScoreGrid — editable table for entering K/P/A scores per student.
 * - Sticky first column (student name) + sticky header
 * - Enter/Tab navigation between cells
 * - Saves only dirty rows
 * - Mobile: one-student-at-a-time form
 */
import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/atlasSupabase";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export type StudentScoreRow = {
  id: string;
  seq: number;
  student_id: string;
  student_name: string;
  score: number | null;       // total score from Excel (read-only)
  total_score: number | null; // k+p+a max (read-only)
  k_score: number | null;
  p_score: number | null;
  a_score: number | null;
};

type Setup = {
  k_total: number;
  p_total: number;
  a_total: number;
};

type Props = {
  rows: StudentScoreRow[];
  setup: Setup;
  onSaved: (updated: StudentScoreRow[]) => void;
};

type EditCell = { k: string; p: string; a: string };

function toStr(v: number | null): string {
  return v === null || v === undefined ? "" : String(v);
}

function toNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isCellInvalid(val: string, max: number): boolean {
  if (val.trim() === "") return false;
  const n = Number(val);
  return !Number.isFinite(n) || n < 0 || n > max;
}

export function UnitScoreGrid({ rows, setup, onSaved }: Props) {
  const isMobile = useIsMobile();

  // editing state: rowId → {k,p,a} as strings
  const [edits, setEdits] = useState<Record<string, EditCell>>(() => {
    const init: Record<string, EditCell> = {};
    rows.forEach((r) => {
      init[r.id] = {
        k: toStr(r.k_score),
        p: toStr(r.p_score),
        a: toStr(r.a_score),
      };
    });
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mobile: current student index
  const [mobileIdx, setMobileIdx] = useState(0);

  // Input refs for keyboard navigation [rowIdx][colIdx 0=k,1=p,2=a]
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const setRef = useCallback(
    (rowIdx: number, colIdx: number, el: HTMLInputElement | null) => {
      if (!inputRefs.current[rowIdx]) inputRefs.current[rowIdx] = [];
      inputRefs.current[rowIdx][colIdx] = el;
    },
    []
  );

  function handleChange(rowId: string, field: "k" | "p" | "a", val: string) {
    setEdits((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [field]: val } }));
    setSaveSuccess(false);
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) {
    const cols = [
      setup.k_total > 0 ? 0 : -1,
      setup.p_total > 0 ? 1 : -1,
      setup.a_total > 0 ? 2 : -1,
    ].filter((c) => c >= 0);

    const currentColPos = cols.indexOf(colIdx);

    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      // Move to same column, next row
      const nextRow = rowIdx + 1;
      if (nextRow < rows.length) {
        inputRefs.current[nextRow]?.[colIdx]?.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevRow = rowIdx - 1;
      if (prevRow >= 0) {
        inputRefs.current[prevRow]?.[colIdx]?.focus();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const nextColPos = e.shiftKey ? currentColPos - 1 : currentColPos + 1;
      if (nextColPos >= 0 && nextColPos < cols.length) {
        inputRefs.current[rowIdx]?.[cols[nextColPos]]?.focus();
      } else if (!e.shiftKey && rowIdx + 1 < rows.length) {
        inputRefs.current[rowIdx + 1]?.[cols[0]]?.focus();
      } else if (e.shiftKey && rowIdx > 0) {
        inputRefs.current[rowIdx - 1]?.[cols[cols.length - 1]]?.focus();
      }
    }
  }

  // Compute dirty rows
  function getDirtyRows(): { id: string; k: number | null; p: number | null; a: number | null }[] {
    return rows
      .filter((r) => {
        const e = edits[r.id];
        if (!e) return false;
        return (
          toNum(e.k) !== r.k_score ||
          toNum(e.p) !== r.p_score ||
          toNum(e.a) !== r.a_score
        );
      })
      .map((r) => ({
        id: r.id,
        k: toNum(edits[r.id].k),
        p: toNum(edits[r.id].p),
        a: toNum(edits[r.id].a),
      }));
  }

  function hasValidationErrors(): boolean {
    return rows.some((r) => {
      const e = edits[r.id];
      if (!e) return false;
      return (
        isCellInvalid(e.k, setup.k_total) ||
        isCellInvalid(e.p, setup.p_total) ||
        isCellInvalid(e.a, setup.a_total)
      );
    });
  }

  async function handleSave() {
    if (hasValidationErrors()) {
      setSaveError("มีคะแนนที่กรอกเกินคะแนนเต็ม กรุณาตรวจสอบก่อนบันทึก");
      return;
    }

    const dirty = getDirtyRows();
    if (dirty.length === 0) {
      setSaveSuccess(true);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      for (const row of dirty) {
        const { error } = await supabase
          .from("unit_assessments")
          .update({ k_score: row.k, p_score: row.p, a_score: row.a })
          .eq("id", row.id);
        if (error) throw error;
      }

      // Build updated rows to return
      const updated: StudentScoreRow[] = rows.map((r) => {
        const d = dirty.find((x) => x.id === r.id);
        if (!d) return r;
        return { ...r, k_score: d.k, p_score: d.p, a_score: d.a };
      });

      onSaved(updated);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(
        `บันทึกไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setSaving(false);
    }
  }

  const dirtyCount = getDirtyRows().length;
  const activeColumns: ("k" | "p" | "a")[] = [
    ...(setup.k_total > 0 ? (["k"] as const) : []),
    ...(setup.p_total > 0 ? (["p"] as const) : []),
    ...(setup.a_total > 0 ? (["a"] as const) : []),
  ];
  const colMax = { k: setup.k_total, p: setup.p_total, a: setup.a_total };
  const colLabel = { k: "K", p: "P", a: "A" };
  const colIdx = { k: 0, p: 1, a: 2 };

  // ── Mobile view ──────────────────────────────────────────────────────────
  if (isMobile) {
    const student = rows[mobileIdx];
    const e = edits[student?.id] ?? { k: "", p: "", a: "" };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {mobileIdx + 1} / {rows.length}
          </p>
          <p className="font-semibold">{student?.student_name}</p>
        </div>

        <div className="space-y-3">
          {activeColumns.map((col) => (
            <div key={col}>
              <label className="text-sm font-medium">
                {colLabel[col]} (เต็ม {colMax[col]})
              </label>
              <Input
                type="number"
                min={0}
                max={colMax[col]}
                value={e[col]}
                onChange={(ev) => handleChange(student.id, col, ev.target.value)}
                className={isCellInvalid(e[col], colMax[col]) ? "border-red-500" : ""}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-between">
          <Button
            variant="outline"
            disabled={mobileIdx === 0}
            onClick={() => setMobileIdx((i) => i - 1)}
          >
            ← ก่อนหน้า
          </Button>
          <Button
            variant="outline"
            disabled={mobileIdx === rows.length - 1}
            onClick={() => setMobileIdx((i) => i + 1)}
          >
            ถัดไป →
          </Button>
        </div>

        {saveError && (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
        {saveSuccess && (
          <Alert className="border-green-500 bg-green-50">
            <AlertDescription>✅ บันทึกสำเร็จ</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleSave} disabled={saving || dirtyCount === 0} className="w-full">
          {saving ? "กำลังบันทึก..." : `💾 บันทึก${dirtyCount > 0 ? ` (${dirtyCount} คน)` : ""}`}
        </Button>
      </div>
    );
  }

  // ── Desktop view ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex gap-3 text-sm flex-wrap">
        {activeColumns.map((col) => (
          <Badge key={col} variant="outline">
            {colLabel[col]} เต็ม {colMax[col]}
          </Badge>
        ))}
        <span className="text-muted-foreground">
          กด Enter/↓↑ เลื่อนแถว • Tab เลื่อนคอลัมน์
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto max-h-[60vh]">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-background border-b">
            <tr>
              <th className="sticky left-0 z-20 bg-background text-left px-3 py-2 w-8">#</th>
              <th className="sticky left-8 z-20 bg-background text-left px-3 py-2 min-w-[180px]">
                ชื่อ-สกุล
              </th>
              {activeColumns.map((col) => (
                <th key={col} className="text-center px-3 py-2 w-24">
                  {colLabel[col]}<span className="text-muted-foreground text-xs">/{colMax[col]}</span>
                </th>
              ))}
              <th className="text-center px-3 py-2 w-20 text-muted-foreground">คะแนนรวม</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const e = edits[row.id] ?? { k: "", p: "", a: "" };
              const hasError = activeColumns.some((col) =>
                isCellInvalid(e[col], colMax[col])
              );
              const isDirty =
                toNum(e.k) !== row.k_score ||
                toNum(e.p) !== row.p_score ||
                toNum(e.a) !== row.a_score;

              // Compute live sum
              const kN = toNum(e.k) ?? 0;
              const pN = toNum(e.p) ?? 0;
              const aN = toNum(e.a) ?? 0;
              const liveSum =
                (e.k || e.p || e.a) ? kN + pN + aN : row.score;

              return (
                <tr
                  key={row.id}
                  className={`border-b last:border-0 ${
                    hasError
                      ? "bg-red-50"
                      : isDirty
                      ? "bg-yellow-50"
                      : rowIdx % 2 === 0
                      ? ""
                      : "bg-muted/30"
                  }`}
                >
                  <td className="sticky left-0 bg-inherit px-3 py-1 text-muted-foreground w-8">
                    {row.seq}
                  </td>
                  <td className="sticky left-8 bg-inherit px-3 py-1 font-medium min-w-[180px]">
                    {row.student_name}
                  </td>
                  {activeColumns.map((col) => (
                    <td key={col} className="px-2 py-1 text-center">
                      <Input
                        ref={(el) => setRef(rowIdx, colIdx[col], el)}
                        type="number"
                        min={0}
                        max={colMax[col]}
                        value={e[col]}
                        onChange={(ev) => handleChange(row.id, col, ev.target.value)}
                        onKeyDown={(ev) => handleKeyDown(ev, rowIdx, colIdx[col])}
                        className={`w-20 text-center h-8 ${
                          isCellInvalid(e[col], colMax[col]) ? "border-red-500 focus-visible:ring-red-500" : ""
                        }`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1 text-center font-medium text-muted-foreground">
                    {liveSum !== null && liveSum !== undefined ? liveSum : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Error / Success */}
      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
      {saveSuccess && (
        <Alert className="border-green-500 bg-green-50">
          <AlertDescription>✅ บันทึกสำเร็จแล้ว</AlertDescription>
        </Alert>
      )}

      {/* Save button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={saving || dirtyCount === 0}
        >
          {saving
            ? "กำลังบันทึก..."
            : dirtyCount > 0
            ? `💾 บันทึก (${dirtyCount} คนที่แก้ไข)`
            : "💾 บันทึก"}
        </Button>
        {dirtyCount > 0 && (
          <span className="text-sm text-muted-foreground">
            มีการแก้ไข {dirtyCount} คน
          </span>
        )}
      </div>
    </div>
  );
}
