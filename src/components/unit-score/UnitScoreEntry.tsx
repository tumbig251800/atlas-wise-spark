/**
 * UnitScoreEntry — filter bar to select which unit to grade,
 * then loads the roster + existing K/P/A scores and passes to UnitScoreGrid.
 * Also handles: delete entire unit, propagate row-delete / row-add from grid.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

  const [selectedSetupId, setSelectedSetupId] = useState<string>("");
  const [rows, setRows] = useState<StudentScoreRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [deletingUnit, setDeletingUnit] = useState(false);
  const [deleteUnitError, setDeleteUnitError] = useState<string | null>(null);

  // Load all setups for this teacher
  useEffect(() => {
    if (!teacherId) return;
    setLoadingSetups(true);
    supabase
      .from("unit_assessment_setups")
      .select("id,subject,academic_term,grade_level,classroom,unit_name,unit_display_name,k_total,p_total,a_total")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setSetupError(error.message);
        else setSetups((data as SetupWithId[]) ?? []);
        setLoadingSetups(false);
      });
  }, [teacherId]);

  // Load rows when setup selected
  useEffect(() => {
    if (!selectedSetupId || !teacherId) { setRows([]); return; }
    const setup = setups.find((s) => s.id === selectedSetupId);
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
      .order("student_name")
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
  }, [selectedSetupId, setups, teacherId]);

  const selectedSetup = setups.find((s) => s.id === selectedSetupId) ?? null;

  function setupLabel(s: SetupWithId) {
    const displayUnit = s.unit_display_name
      ? `${s.unit_name}: ${s.unit_display_name}`
      : s.unit_name;
    return `${s.subject} — ${s.grade_level}/${s.classroom} ${displayUnit} (เทอม ${s.academic_term})`;
  }

  // ── Delete entire unit ────────────────────────────────────────────────────
  async function handleDeleteUnit() {
    if (!selectedSetup || !selectedSetupId || !teacherId) return;
    setDeletingUnit(true);
    setDeleteUnitError(null);
    try {
      // Delete all assessments for this unit
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

      // Delete the setup
      const { error: sErr } = await supabase
        .from("unit_assessment_setups")
        .delete()
        .eq("id", selectedSetupId);
      if (sErr) throw sErr;

      // Update local state
      setSetups((prev) => prev.filter((s) => s.id !== selectedSetupId));
      setSelectedSetupId("");
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
          {/* Setup selector */}
          <div>
            <Label htmlFor="setup-select">เลือกหน่วยที่ต้องการกรอกคะแนน</Label>
            {loadingSetups ? (
              <p className="text-sm text-muted-foreground mt-2">กำลังโหลด...</p>
            ) : setupError ? (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{setupError}</AlertDescription>
              </Alert>
            ) : setups.length === 0 ? (
              <Alert className="mt-2">
                <AlertDescription>
                  ยังไม่มีหน่วยที่ import — กรุณาอัปโหลด Excel ในแท็บ "นำเข้าหน่วย 1" ก่อน
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex gap-2 mt-2">
                <Select value={selectedSetupId} onValueChange={setSelectedSetupId}>
                  <SelectTrigger id="setup-select" className="flex-1">
                    <SelectValue placeholder="— เลือกหน่วย —" />
                  </SelectTrigger>
                  <SelectContent>
                    {setups.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {setupLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Delete entire unit */}
                {selectedSetupId && (
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
                          <strong>
                            {selectedSetup?.unit_display_name ?? selectedSetup?.unit_name}
                          </strong>{" "}
                          ออกถาวร ไม่สามารถย้อนกลับได้
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteUnit}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          ลบทั้งหน่วย
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
            {deleteUnitError && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{deleteUnitError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Grid */}
          {selectedSetupId && (
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
                    setRows((prev) =>
                      prev.map((r) => updated.find((x) => x.id === r.id) ?? r)
                    )
                  }
                  onRowDeleted={(id) =>
                    setRows((prev) =>
                      prev
                        .filter((r) => r.id !== id)
                        .map((r, idx) => ({ ...r, seq: idx + 1 }))
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
