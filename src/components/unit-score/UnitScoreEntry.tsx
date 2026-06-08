/**
 * UnitScoreEntry — filter bar to select which unit to grade,
 * then loads the roster + existing K/P/A scores and passes to UnitScoreGrid.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UnitScoreGrid, type StudentScoreRow } from "./UnitScoreGrid";

type Setup = {
  id: string;
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

export function UnitScoreEntry() {
  const { user } = useAuth();
  const teacherId = user?.id;

  const [setups, setSetups] = useState<Setup[]>([]);
  const [loadingSetups, setLoadingSetups] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Filter state
  const [selectedSetupId, setSelectedSetupId] = useState<string>("");

  // Grid data
  const [rows, setRows] = useState<StudentScoreRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

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
        else setSetups((data as Setup[]) ?? []);
        setLoadingSetups(false);
      });
  }, [teacherId]);

  // Load rows when setup selected
  useEffect(() => {
    if (!selectedSetupId || !teacherId) {
      setRows([]);
      return;
    }
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

  // Group setups for display: "subject — ชั้น/ห้อง หน่วย (เทอม)"
  function setupLabel(s: Setup) {
    const displayUnit = s.unit_display_name ? `${s.unit_name}: ${s.unit_display_name}` : s.unit_name;
    return `${s.subject} — ${s.grade_level}/${s.classroom} ${displayUnit} (เทอม ${s.academic_term})`;
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
              <Select value={selectedSetupId} onValueChange={setSelectedSetupId}>
                <SelectTrigger id="setup-select" className="mt-2">
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
            )}
          </div>

          {/* Grid or messages */}
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
                  <AlertDescription>
                    ไม่พบรายชื่อนักเรียนสำหรับหน่วยนี้
                  </AlertDescription>
                </Alert>
              ) : selectedSetup ? (
                <UnitScoreGrid
                  rows={rows}
                  setup={selectedSetup}
                  onSaved={(updated) =>
                    setRows((prev) =>
                      prev.map((r) => {
                        const u = updated.find((x) => x.id === r.id);
                        return u ?? r;
                      })
                    )
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
