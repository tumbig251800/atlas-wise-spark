/**
 * UnitScoreEntry — cascading filters (ชั้น/ห้อง → วิชา → หน่วย) to select which unit to grade,
 * then loads the roster + existing K/P/A scores and passes to UnitScoreGrid.
 * Also handles: delete entire unit, propagate row-delete / row-add from grid.
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { UnitScoreGrid, type StudentScoreRow, type Setup } from "./UnitScoreGrid";

type SetupWithId = Setup & { id: string };

export function UnitScoreEntry() {
  const { user } = useAuth();
  const teacherId = user?.id;

  const [setups, setSetups] = useState<SetupWithId[]>([]);
  const [loadingSetups, setLoadingSetups] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Cascading filter state
  const [filterGrade, setFilterGrade] = useState("");       // "ป.3/KBW"
  const [filterSubject, setFilterSubject] = useState("");   // "ภาษาไทย"
  const [filterUnitId, setFilterUnitId] = useState("");     // setup.id

  const [rows, setRows] = useState<StudentScoreRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [deletingUnit, setDeletingUnit] = useState(false);
  const [deleteUnitError, setDeleteUnitError] = useState<string | null>(null);

  // Edit K/P/A totals
  const [editingKPA, setEditingKPA] = useState(false);
  const [editK, setEditK] = useState(0);
  const [editP, setEditP] = useState(0);
  const [editA, setEditA] = useState(0);
  const [savingKPA, setSavingKPA] = useState(false);
  const [kpaError, setKpaError] = useState<string | null>(null);
  const [kpaSuccess, setKpaSuccess] = useState(false);

  // Load all setups
  useEffect(() => {
    if (!teacherId) return;
    setLoadingSetups(true);
    supabase
      .from("unit_assessment_setups")
      .select("id,subject,academic_term,grade_level,classroom,unit_name,unit_display_name,k_total,p_total,a_total")
      .eq("teacher_id", teacherId)
      .order("grade_level")
      .then(({ data, error }) => {
        if (error) setSetupError(error.message);
        else setSetups((data as SetupWithId[]) ?? []);
        setLoadingSetups(false);
      });
  }, [teacherId]);

  // Derived filter options
  const gradeOptions = useMemo(() => {
    const seen = new Set<string>();
    return setups
      .map((s) => `${s.grade_level}/${s.classroom}`)
      .filter((g) => { if (seen.has(g)) return false; seen.add(g); return true; })
      .sort();
  }, [setups]);

  const subjectOptions = useMemo(() => {
    if (!filterGrade) return [];
    const [gl, cl] = filterGrade.split("/");
    const seen = new Set<string>();
    return setups
      .filter((s) => s.grade_level === gl && s.classroom === cl)
      .map((s) => s.subject)
      .filter((sub) => { if (seen.has(sub)) return false; seen.add(sub); return true; })
      .sort();
  }, [setups, filterGrade]);

  const unitOptions = useMemo(() => {
    if (!filterGrade || !filterSubject) return [];
    const [gl, cl] = filterGrade.split("/");
    return setups
      .filter((s) => s.grade_level === gl && s.classroom === cl && s.subject === filterSubject)
      .sort((a, b) => a.unit_name.localeCompare(b.unit_name, "th"));
  }, [setups, filterGrade, filterSubject]);

  // Reset downstream when upstream changes
  function handleGradeChange(val: string) {
    setFilterGrade(val);
    setFilterSubject("");
    setFilterUnitId("");
    setRows([]);
  }
  function handleSubjectChange(val: string) {
    setFilterSubject(val);
    setFilterUnitId("");
    setRows([]);
  }

  // Load rows when unit selected
  useEffect(() => {
    if (!filterUnitId || !teacherId) { setRows([]); return; }
    const setup = setups.find((s) => s.id === filterUnitId);
    if (!setup) return;

    setLoadingRows(true);
    setRowsError(null);
    supabase
      .from("unit_assessments")
      .select("id,student_id,student_name,score,total_score,k_score,p_score,a_score")
      .eq("teacher_id", teacherId)
      .eq("subject", setup.subject)
      .eq("grade_level", setup.grade_level)
      .eq("classroom", setup.classroom)
      .eq("academic_term", setup.academic_term)
      .eq("unit_name", setup.unit_name)
      .order("student_id")
      .then(({ data, error }) => {
        if (error) {
          setRowsError(error.message);
        } else {
          setRows(
            (data ?? []).map((r, idx) => ({
              id: r.id,
              seq: idx + 1,
              student_id: r.student_id,
              student_name: r.student_name ?? "",
              score: r.score,
              total_score: r.total_score,
              k_score: r.k_score,
              p_score: r.p_score,
              a_score: r.a_score,
            }))
          );
        }
        setLoadingRows(false);
      });
  }, [filterUnitId, setups, teacherId]);

  const selectedSetup = setups.find((s) => s.id === filterUnitId) ?? null;

  // ── Edit K/P/A totals ─────────────────────────────────────────────────────
  function openEditKPA() {
    if (!selectedSetup) return;
    setEditK(selectedSetup.k_total);
    setEditP(selectedSetup.p_total);
    setEditA(selectedSetup.a_total);
    setKpaError(null);
    setKpaSuccess(false);
    setEditingKPA(true);
  }

  async function handleSaveKPA() {
    if (!filterUnitId || !selectedSetup) return;
    const total = editK + editP + editA;
    if (total <= 0) { setKpaError("K + P + A ต้องมากกว่า 0"); return; }
    if (editK < 0 || editP < 0 || editA < 0) { setKpaError("คะแนนต้องไม่ติดลบ"); return; }

    setSavingKPA(true); setKpaError(null); setKpaSuccess(false);
    try {
      // Update setup
      const { error: sErr } = await supabase
        .from("unit_assessment_setups")
        .update({ k_total: editK, p_total: editP, a_total: editA })
        .eq("id", filterUnitId);
      if (sErr) throw sErr;

      // Update all assessment rows for this unit (denormalized cache)
      const { error: aErr } = await supabase
        .from("unit_assessments")
        .update({ k_total: editK, p_total: editP, a_total: editA, total_score: total })
        .eq("teacher_id", teacherId!)
        .eq("subject", selectedSetup.subject)
        .eq("grade_level", selectedSetup.grade_level)
        .eq("classroom", selectedSetup.classroom)
        .eq("academic_term", selectedSetup.academic_term)
        .eq("unit_name", selectedSetup.unit_name);
      if (aErr) throw aErr;

      // Update local state
      setSetups((prev) => prev.map((s) =>
        s.id === filterUnitId ? { ...s, k_total: editK, p_total: editP, a_total: editA } : s
      ));
      setKpaSuccess(true);
      setEditingKPA(false);
    } catch (err) {
      setKpaError(`บันทึกไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSavingKPA(false);
    }
  }

  // ── Delete entire unit ────────────────────────────────────────────────────
  async function handleDeleteUnit() {
    if (!selectedSetup || !filterUnitId || !teacherId) return;
    setDeletingUnit(true);
    setDeleteUnitError(null);
    try {
      const { error: aErr } = await supabase
        .from("unit_assessments")
        .delete()
        .eq("teacher_id", teacherId)
        .eq("subject", selectedSetup.subject)
        .eq("grade_level", selectedSetup.grade_level)
        .eq("classroom", selectedSetup.classroom)
        .eq("academic_term", selectedSetup.academic_term)
        .eq("unit_name", selectedSetup.unit_name);
      if (aErr) throw aErr;

      const { error: sErr } = await supabase
        .from("unit_assessment_setups")
        .delete()
        .eq("id", filterUnitId);
      if (sErr) throw sErr;

      setSetups((prev) => prev.filter((s) => s.id !== filterUnitId));
      setFilterUnitId("");
      setRows([]);
    } catch (err) {
      setDeleteUnitError(`ลบไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeletingUnit(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📝 บันทึกคะแนน K/P/A รายคน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {loadingSetups ? (
            <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
          ) : setupError ? (
            <Alert variant="destructive">
              <AlertDescription>{setupError}</AlertDescription>
            </Alert>
          ) : setups.length === 0 ? (
            <Alert>
              <AlertDescription>
                ยังไม่มีหน่วยที่ import — กรุณาอัปโหลด Excel ในแท็บ "นำเข้าหน่วย 1" ก่อน
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* ── Cascading filters ── */}
              <div className="grid grid-cols-3 gap-4">
                {/* ชั้น/ห้อง */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">ชั้น / ห้อง</Label>
                  <Select value={filterGrade} onValueChange={handleGradeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="— เลือกชั้น —" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeOptions.map((g) => (
                        <SelectItem key={g} value={g}>{g.replace("/", " / ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* วิชา */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">วิชา</Label>
                  <Select value={filterSubject} onValueChange={handleSubjectChange} disabled={!filterGrade}>
                    <SelectTrigger>
                      <SelectValue placeholder={filterGrade ? "— เลือกวิชา —" : "เลือกชั้นก่อน"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectOptions.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* หน่วย */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">หน่วย</Label>
                  <Select value={filterUnitId} onValueChange={setFilterUnitId} disabled={!filterSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder={filterSubject ? "— เลือกหน่วย —" : "เลือกวิชาก่อน"} />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.unit_name}{u.unit_display_name ? `: ${u.unit_display_name}` : ""}
                          <span className="text-muted-foreground text-xs ml-1">(เทอม {u.academic_term})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Delete unit button */}
              {filterUnitId && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {rows.length > 0 ? `${rows.length} คน` : ""}
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={deletingUnit}>
                        {deletingUnit ? "กำลังลบ..." : "🗑 ลบทั้งหน่วย"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ลบหน่วยนี้ทั้งหมด?</AlertDialogTitle>
                        <AlertDialogDescription>
                          จะลบ setup และคะแนนนักเรียน{" "}
                          <strong>{rows.length} คน</strong> ของหน่วย{" "}
                          <strong>{selectedSetup?.unit_display_name ?? selectedSetup?.unit_name}</strong>{" "}
                          วิชา <strong>{selectedSetup?.subject}</strong> ออกถาวร ไม่สามารถย้อนกลับได้
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUnit} className="bg-red-500 hover:bg-red-600">
                          ลบทั้งหน่วย
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {deleteUnitError && (
                <Alert variant="destructive">
                  <AlertDescription>{deleteUnitError}</AlertDescription>
                </Alert>
              )}

              {/* K/P/A totals display + edit */}
              {filterUnitId && selectedSetup && (
                <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-sm">
                      <span>คะแนนเต็ม:</span>
                      <span className="font-medium">K = {selectedSetup.k_total}</span>
                      <span className="font-medium">P = {selectedSetup.p_total}</span>
                      <span className="font-medium">
                        A = {selectedSetup.a_total}
                        {selectedSetup.a_total === 0 && (
                          <span className="ml-1 text-xs text-orange-400">(สังเกตพฤติกรรม)</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">รวม {selectedSetup.k_total + selectedSetup.p_total + selectedSetup.a_total}</span>
                    </div>
                    {!editingKPA && (
                      <Button variant="outline" size="sm" onClick={openEditKPA}>
                        ✏️ แก้ไข K/P/A เต็ม
                      </Button>
                    )}
                  </div>

                  {editingKPA && (
                    <div className="space-y-3">
                      <div className="flex gap-3 items-end flex-wrap">
                        <div>
                          <Label className="text-xs">K เต็ม</Label>
                          <Input type="number" min={0} value={editK}
                            onChange={(e) => setEditK(Math.max(0, Number(e.target.value)))}
                            className="w-20 h-8" />
                        </div>
                        <div>
                          <Label className="text-xs">P เต็ม</Label>
                          <Input type="number" min={0} value={editP}
                            onChange={(e) => setEditP(Math.max(0, Number(e.target.value)))}
                            className="w-20 h-8" />
                        </div>
                        <div>
                          <Label className="text-xs">
                            A เต็ม
                            <span className="ml-1 text-orange-400">(สังเกตพฤติกรรม)</span>
                          </Label>
                          <Input type="number" min={0} value={editA}
                            onChange={(e) => setEditA(Math.max(0, Number(e.target.value)))}
                            className="w-20 h-8" />
                        </div>
                        <div className="text-sm font-medium pb-1">
                          รวม {editK + editP + editA}
                        </div>
                        <div className="flex gap-2 pb-1">
                          <Button size="sm" onClick={handleSaveKPA} disabled={savingKPA}>
                            {savingKPA ? "กำลังบันทึก..." : "บันทึก"}
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => { setEditingKPA(false); setKpaError(null); }}>
                            ยกเลิก
                          </Button>
                        </div>
                      </div>
                      {kpaError && (
                        <Alert variant="destructive">
                          <AlertDescription>{kpaError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {kpaSuccess && (
                    <Alert className="border-green-500 bg-green-50">
                      <AlertDescription>✅ อัปเดต K/P/A เต็มสำเร็จ</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </>
          )}

          {/* Grid */}
          {filterUnitId && (
            <>
              {loadingRows ? (
                <p className="text-sm text-muted-foreground">กำลังโหลดรายชื่อ...</p>
              ) : rowsError ? (
                <Alert variant="destructive">
                  <AlertDescription>{rowsError}</AlertDescription>
                </Alert>
              ) : rows.length === 0 ? (
                <Alert>
                  <AlertDescription>ไม่พบรายชื่อนักเรียนสำหรับหน่วยนี้</AlertDescription>
                </Alert>
              ) : selectedSetup ? (
                <UnitScoreGrid
                  rows={rows}
                  setup={selectedSetup}
                  onSaved={(updated) =>
                    setRows((prev) => prev.map((r) => updated.find((x) => x.id === r.id) ?? r))
                  }
                  onRowDeleted={(id) =>
                    setRows((prev) =>
                      prev.filter((r) => r.id !== id).map((r, idx) => ({ ...r, seq: idx + 1 }))
                    )
                  }
                  onRowAdded={(row) =>
                    setRows((prev) => [...prev, { ...row, seq: prev.length + 1 }])
                  }
                />
              ) : null}
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
