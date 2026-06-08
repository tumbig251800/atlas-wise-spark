/**
 * UnitScoreGrid — editable table for entering K/P/A scores per student.
 * - Sticky first column (student name) + sticky header
 * - Enter/Tab navigation between cells
 * - Saves only dirty rows
 * - Delete individual student row
 * - Add late student (took exam on different date)
 * - Mobile: one-student-at-a-time form
 */
import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type StudentScoreRow = {
  id: string;
  seq: number;
  student_id: string;
  student_name: string;
  score: number | null;
  total_score: number | null;
  k_score: number | null;
  p_score: number | null;
  a_score: number | null;
};

export type Setup = {
  subject: string;
  academic_term: string;
  grade_level: string;
  classroom: string;
  unit_name: string;
  unit_display_name: string | null;
  k_total: number;
  p_total: number;
  a_total: number;
};

type Props = {
  rows: StudentScoreRow[];
  setup: Setup;
  onSaved: (updated: StudentScoreRow[]) => void;
  onRowDeleted: (id: string) => void;
  onRowAdded: (row: StudentScoreRow) => void;
};

type EditCell = { k: string; p: string; a: string; score: string };

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

export function UnitScoreGrid({ rows, setup, onSaved, onRowDeleted, onRowAdded }: Props) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const teacherId = user?.id;

  const [edits, setEdits] = useState<Record<string, EditCell>>(() => {
    const init: Record<string, EditCell> = {};
    rows.forEach((r) => {
      init[r.id] = { k: toStr(r.k_score), p: toStr(r.p_score), a: toStr(r.a_score), score: toStr(r.score) };
    });
    return init;
  });

  // Sync edits when rows change (new row added)
  const prevRowIds = useRef<Set<string>>(new Set(rows.map((r) => r.id)));
  rows.forEach((r) => {
    if (!prevRowIds.current.has(r.id)) {
      prevRowIds.current.add(r.id);
      if (!edits[r.id]) {
        setEdits((prev) => ({
          ...prev,
          [r.id]: { k: toStr(r.k_score), p: toStr(r.p_score), a: toStr(r.a_score), score: toStr(r.score) },
        }));
      }
    }
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add late student form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addStudentCode, setAddStudentCode] = useState("");
  const [addStudentName, setAddStudentName] = useState("");
  const [addScore, setAddScore] = useState("0");
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Mobile state
  const [mobileIdx, setMobileIdx] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const setRef = useCallback(
    (rowIdx: number, colIdx: number, el: HTMLInputElement | null) => {
      if (!inputRefs.current[rowIdx]) inputRefs.current[rowIdx] = [];
      inputRefs.current[rowIdx][colIdx] = el;
    },
    []
  );

  function handleChange(rowId: string, field: "k" | "p" | "a" | "score", val: string) {
    setEdits((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [field]: val } }));
    setSaveSuccess(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) {
    const cols = [
      ...(setup.k_total > 0 ? [0] : []),
      ...(setup.p_total > 0 ? [1] : []),
      ...(setup.a_total > 0 ? [2] : []),
    ];
    const currentColPos = cols.indexOf(colIdx);

    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      if (rowIdx + 1 < rows.length) inputRefs.current[rowIdx + 1]?.[colIdx]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rowIdx > 0) inputRefs.current[rowIdx - 1]?.[colIdx]?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const nextPos = e.shiftKey ? currentColPos - 1 : currentColPos + 1;
      if (nextPos >= 0 && nextPos < cols.length) {
        inputRefs.current[rowIdx]?.[cols[nextPos]]?.focus();
      } else if (!e.shiftKey && rowIdx + 1 < rows.length) {
        inputRefs.current[rowIdx + 1]?.[cols[0]]?.focus();
      } else if (e.shiftKey && rowIdx > 0) {
        inputRefs.current[rowIdx - 1]?.[cols[cols.length - 1]]?.focus();
      }
    }
  }

  const totalMax = setup.k_total + setup.p_total + setup.a_total;

  function getDirtyRows() {
    return rows
      .filter((r) => {
        const e = edits[r.id];
        if (!e) return false;
        return (
          toNum(e.k) !== r.k_score ||
          toNum(e.p) !== r.p_score ||
          toNum(e.a) !== r.a_score ||
          toNum(e.score) !== r.score
        );
      })
      .map((r) => ({
        id: r.id,
        k: toNum(edits[r.id].k),
        p: toNum(edits[r.id].p),
        a: toNum(edits[r.id].a),
        score: toNum(edits[r.id].score),
      }));
  }

  function hasValidationErrors() {
    return rows.some((r) => {
      const e = edits[r.id];
      if (!e) return false;
      return (
        isCellInvalid(e.k, setup.k_total) ||
        isCellInvalid(e.p, setup.p_total) ||
        isCellInvalid(e.a, setup.a_total) ||
        isCellInvalid(e.score, totalMax)
      );
    });
  }

  async function handleSave() {
    if (hasValidationErrors()) {
      setSaveError("มีคะแนนที่กรอกเกินคะแนนเต็ม กรุณาตรวจสอบก่อนบันทึก");
      return;
    }
    const dirty = getDirtyRows();
    if (dirty.length === 0) { setSaveSuccess(true); return; }

    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      for (const row of dirty) {
        const { error } = await supabase
          .from("unit_assessments")
          .update({ k_score: row.k, p_score: row.p, a_score: row.a, score: row.score })
          .eq("id", row.id);
        if (error) throw error;
      }
      onSaved(rows.map((r) => {
        const d = dirty.find((x) => x.id === r.id);
        return d ? { ...r, k_score: d.k, p_score: d.p, a_score: d.a, score: d.score } : r;
      }));
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(`บันทึกไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete single row ─────────────────────────────────────────────────────
  async function handleDeleteRow(id: string) {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("unit_assessments").delete().eq("id", id);
      if (error) throw error;
      onRowDeleted(id);
    } catch (err) {
      setSaveError(`ลบไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeletingId(null);
    }
  }

  // ── Add late student ──────────────────────────────────────────────────────
  async function handleAddStudent() {
    if (!addStudentCode.trim()) { setAddError("กรุณากรอกรหัสนักเรียน"); return; }
    if (!addStudentName.trim()) { setAddError("กรุณากรอกชื่อ-สกุล"); return; }
    if (!teacherId) { setAddError("กรุณา login ก่อน"); return; }

    const totalScore = setup.k_total + setup.p_total + setup.a_total;
    const scoreNum = addScore.trim() !== "" ? Number(addScore) : null;
    if (scoreNum !== null && (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > totalScore)) {
      setAddError(`คะแนนต้องอยู่ระหว่าง 0–${totalScore}`);
      return;
    }

    // Check duplicate in current rows
    if (rows.some((r) => r.student_id === addStudentCode.trim())) {
      setAddError("นักเรียนรหัสนี้มีอยู่ในหน่วยนี้แล้ว");
      return;
    }

    setAdding(true); setAddError(null);
    try {
      const nameParts = addStudentName.trim().split(" ");
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      const firstName = nameParts.slice(0, nameParts.length > 1 ? -1 : 1).join(" ");

      // Upsert student
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("student_id", addStudentCode.trim())
        .eq("grade_level", setup.grade_level)
        .eq("classroom", setup.classroom)
        .maybeSingle();

      if (!existingStudent) {
        const { error: sErr } = await supabase.from("students").insert({
          teacher_id: teacherId,
          student_id: addStudentCode.trim(),
          student_code: addStudentCode.trim(),
          first_name: firstName,
          last_name: lastName,
          grade_level: setup.grade_level,
          classroom: setup.classroom,
        });
        if (sErr) throw sErr;
      }

      // Insert unit_assessment
      const { data: newRow, error: aErr } = await supabase
        .from("unit_assessments")
        .insert({
          teacher_id: teacherId,
          assessed_by: teacherId,
          student_id: addStudentCode.trim(),
          student_name: addStudentName.trim(),
          subject: setup.subject,
          grade_level: setup.grade_level,
          classroom: setup.classroom,
          academic_term: setup.academic_term,
          unit_name: setup.unit_name,
          score: scoreNum,
          total_score: totalScore,
          assessed_date: addDate,
          k_score: null,
          p_score: null,
          a_score: null,
          k_total: setup.k_total,
          p_total: setup.p_total,
          a_total: setup.a_total,
        })
        .select("id,student_id,student_name,score,total_score,k_score,p_score,a_score")
        .single();

      if (aErr) throw aErr;

      const added: StudentScoreRow = {
        id: newRow.id,
        seq: rows.length + 1,
        student_id: newRow.student_id,
        student_name: newRow.student_name ?? "",
        score: newRow.score,
        total_score: newRow.total_score,
        k_score: null,
        p_score: null,
        a_score: null,
      };

      onRowAdded(added);
      setAddStudentCode(""); setAddStudentName(""); setAddScore("0");
      setAddDate(new Date().toISOString().slice(0, 10));
      setShowAddForm(false);
    } catch (err) {
      setAddError(`เพิ่มไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setAdding(false);
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

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (isMobile) {
    const student = rows[mobileIdx];
    const e = edits[student?.id] ?? { k: "", p: "", a: "", score: "" };
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{mobileIdx + 1} / {rows.length}</p>
          <p className="font-semibold">{student?.student_name}</p>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">คะแนนรวม (เต็ม {totalMax})</Label>
            <Input type="number" min={0} max={totalMax} value={e.score}
              onChange={(ev) => handleChange(student.id, "score", ev.target.value)}
              className={isCellInvalid(e.score, totalMax) ? "border-red-500" : ""} />
          </div>
          {activeColumns.map((col) => (
            <div key={col}>
              <Label className="text-sm font-medium">{colLabel[col]} (เต็ม {colMax[col]})</Label>
              <Input type="number" min={0} max={colMax[col]} value={e[col]}
                onChange={(ev) => handleChange(student.id, col, ev.target.value)}
                className={isCellInvalid(e[col], colMax[col]) ? "border-red-500" : ""} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-between">
          <Button variant="outline" disabled={mobileIdx === 0} onClick={() => setMobileIdx((i) => i - 1)}>← ก่อนหน้า</Button>
          <Button variant="outline" disabled={mobileIdx === rows.length - 1} onClick={() => setMobileIdx((i) => i + 1)}>ถัดไป →</Button>
        </div>
        {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}
        {saveSuccess && <Alert className="border-green-500 bg-green-50"><AlertDescription>✅ บันทึกสำเร็จ</AlertDescription></Alert>}
        <Button onClick={handleSave} disabled={saving || dirtyCount === 0} className="w-full">
          {saving ? "กำลังบันทึก..." : `💾 บันทึก${dirtyCount > 0 ? ` (${dirtyCount} คน)` : ""}`}
        </Button>
      </div>
    );
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex gap-3 text-sm flex-wrap items-center">
        {activeColumns.map((col) => (
          <Badge key={col} variant="outline">{colLabel[col]} เต็ม {colMax[col]}</Badge>
        ))}
        <span className="text-muted-foreground">Enter/↓↑ เลื่อนแถว • Tab เลื่อนคอลัมน์</span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto max-h-[60vh]">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-background border-b">
            <tr>
              <th className="sticky left-0 z-20 bg-background text-left px-3 py-2 w-8">#</th>
              <th className="sticky left-8 z-20 bg-background text-left px-3 py-2 min-w-[180px]">ชื่อ-สกุล</th>
              {activeColumns.map((col) => (
                <th key={col} className="text-center px-3 py-2 w-24">
                  {colLabel[col]}<span className="text-muted-foreground text-xs">/{colMax[col]}</span>
                </th>
              ))}
              <th className="text-center px-3 py-2 w-24">คะแนนรวม<span className="text-muted-foreground text-xs">/{totalMax}</span></th>
              <th className="px-3 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const e = edits[row.id] ?? { k: "", p: "", a: "", score: "" };
              const scoreInvalid = isCellInvalid(e.score, totalMax);
              const hasError = scoreInvalid || activeColumns.some((col) => isCellInvalid(e[col], colMax[col]));
              const isDirty =
                toNum(e.k) !== row.k_score ||
                toNum(e.p) !== row.p_score ||
                toNum(e.a) !== row.a_score ||
                toNum(e.score) !== row.score;
              const isAbsent = row.score === 0 && row.k_score === null;

              return (
                <tr key={row.id} className={`border-b last:border-0 ${
                  hasError ? "bg-red-50" : isDirty ? "bg-yellow-50" : rowIdx % 2 === 0 ? "" : "bg-muted/30"
                }`}>
                  <td className="sticky left-0 bg-inherit px-3 py-1 text-muted-foreground w-8">{row.seq}</td>
                  <td className="sticky left-8 bg-inherit px-3 py-1 font-medium min-w-[180px]">
                    <span>{row.student_name}</span>
                    {isAbsent && <span className="ml-2 text-xs text-orange-500 font-normal">ขาดสอบ</span>}
                  </td>
                  {activeColumns.map((col) => (
                    <td key={col} className="px-2 py-1 text-center">
                      <Input
                        ref={(el) => setRef(rowIdx, colIdx[col], el)}
                        type="number" min={0} max={colMax[col]}
                        value={e[col]}
                        onChange={(ev) => handleChange(row.id, col, ev.target.value)}
                        onKeyDown={(ev) => handleKeyDown(ev, rowIdx, colIdx[col])}
                        className={`w-20 text-center h-8 ${
                          isCellInvalid(e[col], colMax[col]) ? "border-red-500 focus-visible:ring-red-500" : ""
                        }`}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center">
                    <Input
                      type="number" min={0} max={totalMax}
                      value={e.score}
                      onChange={(ev) => handleChange(row.id, "score", ev.target.value)}
                      className={`w-20 text-center h-8 ${scoreInvalid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          disabled={deletingId === row.id}>
                          {deletingId === row.id ? "…" : "🗑"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ลบนักเรียนออกจากหน่วยนี้?</AlertDialogTitle>
                          <AlertDialogDescription>
                            จะลบข้อมูลคะแนนของ <strong>{row.student_name}</strong> ออกจากหน่วยนี้ถาวร ไม่สามารถย้อนกลับได้
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteRow(row.id)}
                            className="bg-red-500 hover:bg-red-600">
                            ลบ
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add late student */}
      {showAddForm ? (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <p className="font-medium text-sm">➕ เพิ่มนักเรียนขาดสอบ / สอบทีหลัง</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">รหัสนักเรียน</Label>
              <Input value={addStudentCode} onChange={(e) => setAddStudentCode(e.target.value)} placeholder="เช่น 9076" />
            </div>
            <div>
              <Label className="text-xs">ชื่อ-สกุล</Label>
              <Input value={addStudentName} onChange={(e) => setAddStudentName(e.target.value)} placeholder="เช่น เด็กชาย สมชาย ใจดี" />
            </div>
            <div>
              <Label className="text-xs">คะแนนรวม (เต็ม {totalMax}) — 0 = ขาดสอบ</Label>
              <Input type="number" min={0} max={totalMax}
                value={addScore} onChange={(e) => setAddScore(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">วันที่สอบ</Label>
              <Input type="date" value={addDate} onChange={(e) => setAddDate(e.target.value)} />
            </div>
          </div>
          {addError && <Alert variant="destructive"><AlertDescription>{addError}</AlertDescription></Alert>}
          <div className="flex gap-2">
            <Button onClick={handleAddStudent} disabled={adding}>
              {adding ? "กำลังเพิ่ม..." : "เพิ่ม"}
            </Button>
            <Button variant="outline" onClick={() => { setShowAddForm(false); setAddError(null); }}>ยกเลิก</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          ➕ เพิ่มนักเรียนขาดสอบ / สอบทีหลัง
        </Button>
      )}

      {/* Error / Success */}
      {saveError && <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>}
      {saveSuccess && <Alert className="border-green-500 bg-green-50"><AlertDescription>✅ บันทึกสำเร็จแล้ว</AlertDescription></Alert>}

      {/* Save */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving || dirtyCount === 0}>
          {saving ? "กำลังบันทึก..." : dirtyCount > 0 ? `💾 บันทึก (${dirtyCount} คนที่แก้ไข)` : "💾 บันทึก"}
        </Button>
        {dirtyCount > 0 && <span className="text-sm text-muted-foreground">มีการแก้ไข {dirtyCount} คน</span>}
      </div>
    </div>
  );
}
