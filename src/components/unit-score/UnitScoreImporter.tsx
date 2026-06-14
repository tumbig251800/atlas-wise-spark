/**
 * UnitScoreImporter.tsx
 * Dialog สำหรับนำเข้าคะแนน K/P/A รายข้อจาก Excel
 * 4 ขั้นตอน: เลือกไฟล์ → Validate → Preview → บันทึก
 */
import { useState } from "react";
import { parseUnitScoreExcel, type UnitScoreParseResult } from "@/lib/unitScoreExcelParser";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
};

type Step = "select" | "preview" | "confirm" | "saving" | "done";

export function UnitScoreImporter({ open, onOpenChange, onImportSuccess }: Props) {
  const { user } = useAuth();
  const teacherId = user?.id;

  const [step, setStep] = useState<Step>("select");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<UnitScoreParseResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Validation state
  const [notFoundIds, setNotFoundIds] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  // Handle file selection
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);
    setParseError(null);
    setParseResult(null);

    try {
      const result = await parseUnitScoreExcel(selectedFile);
      setParseResult(result);

      // ถ้ามี error จาก parser ให้หยุดที่ขั้น select
      if (result.errors.length > 0) {
        setParseError(result.errors.join(" • "));
        setStep("select");
      } else {
        // ไปขั้น preview
        setStep("preview");
      }
    } catch (err) {
      setParseError(`อ่านไฟล์ไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
      setStep("select");
    } finally {
      setParsing(false);
    }
  }

  // Validate ก่อนยืนยัน (ตรวจสอบว่า student_id มีในระบบไหม)
  async function handleValidateAndPreview() {
    if (!parseResult || !parseResult.metadata || !teacherId) return;

    setStep("confirm");
    setSaveProgress(["กำลังตรวจสอบรหัสนักเรียน..."]);

    try {
      const studentIds = parseResult.students.map((s) => s.student_id);

      // ดึง student_id ที่มีในระบบ (ตรวจจากตาราง students)
      const { data: existingStudents, error } = await supabase
        .from("students")
        .select("student_id")
        .in("student_id", studentIds);

      if (error) throw error;

      const existingIds = new Set(existingStudents?.map((s) => s.student_id) ?? []);
      const notFound = studentIds.filter((id) => !existingIds.has(id));
      setNotFoundIds(notFound);

      // ตรวจสอบว่ามีข้อมูลซ้ำในระบบไหม
      const { data: existingAssessments } = await supabase
        .from("unit_assessments")
        .select("student_id")
        .eq("teacher_id", teacherId)
        .eq("subject", parseResult.metadata.subject)
        .eq("grade_level", parseResult.metadata.grade_level)
        .eq("classroom", parseResult.metadata.classroom)
        .eq("academic_term", parseResult.metadata.academic_term)
        .eq("unit_name", parseResult.metadata.unit_name);

      const existingAssessmentIds = new Set(existingAssessments?.map((a) => a.student_id) ?? []);
      const duplicates = studentIds.filter((id) => existingAssessmentIds.has(id));
      setDuplicateCount(duplicates.length);

      setSaveProgress([]);
    } catch (err) {
      setSaveError(`ตรวจสอบข้อมูลไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
      setStep("preview");
    }
  }

  // บันทึกข้อมูล
  async function handleSave() {
    if (!parseResult || !parseResult.metadata || !teacherId) return;

    setStep("saving");
    setSaving(true);
    setSaveError(null);
    setSaveProgress([]);
    setSavedCount(0);
    setSkippedCount(0);

    try {
      const metadata = parseResult.metadata;

      // === STEP 1: Upsert unit_assessment_setups ===
      setSaveProgress((prev) => [...prev, "กำลังบันทึก setup หน่วย..."]);

      const { data: existingSetup } = await supabase
        .from("unit_assessment_setups")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("subject", metadata.subject)
        .eq("grade_level", metadata.grade_level)
        .eq("classroom", metadata.classroom)
        .eq("academic_term", metadata.academic_term)
        .eq("unit_name", metadata.unit_name)
        .maybeSingle();

      if (existingSetup) {
        // Update existing
        const { error: setupUpdateErr } = await supabase
          .from("unit_assessment_setups")
          .update({
            assessed_date: metadata.assessed_date,
            k_total: metadata.k_total,
            p_total: metadata.p_total,
            a_total: metadata.a_total,
          })
          .eq("id", existingSetup.id);

        if (setupUpdateErr) throw setupUpdateErr;
        setSaveProgress((prev) => [...prev, "✓ อัปเดต setup หน่วย"]);
      } else {
        // Insert new
        const { error: setupInsertErr } = await supabase
          .from("unit_assessment_setups")
          .insert({
            teacher_id: teacherId,
            subject: metadata.subject,
            grade_level: metadata.grade_level,
            classroom: metadata.classroom,
            academic_term: metadata.academic_term,
            unit_name: metadata.unit_name,
            unit_display_name: metadata.unit_name,
            assessed_date: metadata.assessed_date,
            k_total: metadata.k_total,
            p_total: metadata.p_total,
            a_total: metadata.a_total,
          });

        if (setupInsertErr) throw setupInsertErr;
        setSaveProgress((prev) => [...prev, "✓ สร้าง setup หน่วยใหม่"]);
      }

      // === STEP 2: Upsert unit_assessments ===
      setSaveProgress((prev) => [...prev, "กำลังบันทึกคะแนนนักเรียน..."]);

      const totalScore = metadata.k_total + metadata.p_total + metadata.a_total;
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const student of parseResult.students) {
        // ข้ามนักเรียนที่รหัสไม่พบในระบบ
        if (notFoundIds.includes(student.student_id)) {
          skipped++;
          continue;
        }

        // ตรวจสอบว่ามีข้อมูลเดิมไหม
        const { data: existing } = await supabase
          .from("unit_assessments")
          .select("id")
          .eq("teacher_id", teacherId)
          .eq("student_id", student.student_id)
          .eq("subject", metadata.subject)
          .eq("grade_level", metadata.grade_level)
          .eq("classroom", metadata.classroom)
          .eq("academic_term", metadata.academic_term)
          .eq("unit_name", metadata.unit_name)
          .maybeSingle();

        if (existing) {
          // Update
          const { error: updateErr } = await supabase
            .from("unit_assessments")
            .update({
              student_name: student.student_name,
              k_score: student.k_score,
              p_score: student.p_score,
              a_score: student.a_score,
              score: student.score,
              total_score: totalScore,
              k_total: metadata.k_total,
              p_total: metadata.p_total,
              a_total: metadata.a_total,
              assessed_date: metadata.assessed_date,
              assessed_by: teacherId,
            })
            .eq("id", existing.id);

          if (updateErr) throw updateErr;
          updated++;
        } else {
          // Insert
          const { error: insertErr } = await supabase
            .from("unit_assessments")
            .insert({
              teacher_id: teacherId,
              assessed_by: teacherId,
              student_id: student.student_id,
              student_name: student.student_name,
              subject: metadata.subject,
              grade_level: metadata.grade_level,
              classroom: metadata.classroom,
              academic_term: metadata.academic_term,
              unit_name: metadata.unit_name,
              k_score: student.k_score,
              p_score: student.p_score,
              a_score: student.a_score,
              score: student.score,
              total_score: totalScore,
              k_total: metadata.k_total,
              p_total: metadata.p_total,
              a_total: metadata.a_total,
              assessed_date: metadata.assessed_date,
            });

          if (insertErr) throw insertErr;
          created++;
        }
      }

      setSavedCount(created + updated);
      setSkippedCount(skipped);
      setSaveProgress((prev) => [
        ...prev,
        `✓ บันทึกคะแนน: ${created} คนใหม่, ${updated} คนอัปเดต${skipped > 0 ? `, ข้าม ${skipped} คน` : ""}`,
      ]);

      setStep("done");
    } catch (err) {
      setSaveError(`บันทึกไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
      setStep("confirm");
    } finally {
      setSaving(false);
    }
  }

  // Reset และปิด dialog
  function handleClose() {
    setStep("select");
    setFile(null);
    setParseResult(null);
    setParseError(null);
    setNotFoundIds([]);
    setDuplicateCount(0);
    setSaveProgress([]);
    setSaveError(null);
    setSavedCount(0);
    setSkippedCount(0);
    onOpenChange(false);
  }

  // ปิดหลังบันทึกสำเร็จ
  function handleDone() {
    if (onImportSuccess) onImportSuccess();
    handleClose();
  }

  const validCount = parseResult ? parseResult.students.length - notFoundIds.length : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📤 นำเข้าคะแนนจาก Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ขั้น 1: เลือกไฟล์ */}
          {step === "select" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="file-upload" className="text-base font-semibold">
                  1️⃣ เลือกไฟล์ Excel
                </Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  รองรับเฉพาะไฟล์ .xlsx จาก Template ของโรงเรียนเท่านั้น
                </p>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  disabled={parsing}
                />
              </div>

              {parsing && (
                <p className="text-sm text-muted-foreground">กำลังอ่านไฟล์...</p>
              )}

              {parseError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-semibold mb-1">❌ ข้อผิดพลาด:</p>
                    <p>{parseError}</p>
                  </AlertDescription>
                </Alert>
              )}

              {parseResult && parseResult.warnings.length > 0 && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertDescription>
                    <p className="font-semibold mb-1">⚠️ คำเตือน:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {parseResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* ขั้น 2-3: Preview */}
          {(step === "preview" || step === "confirm") && parseResult && parseResult.metadata && (
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">2️⃣ ข้อมูลจากไฟล์</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">วิชา:</span>{" "}
                    <span className="font-medium">{parseResult.metadata.subject}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ชั้น/ห้อง:</span>{" "}
                    <span className="font-medium">
                      {parseResult.metadata.grade_level} / {parseResult.metadata.classroom}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">หน่วย:</span>{" "}
                    <span className="font-medium">{parseResult.metadata.unit_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ภาคเรียน:</span>{" "}
                    <span className="font-medium">{parseResult.metadata.academic_term}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">วันที่สอบ:</span>{" "}
                    <span className="font-medium">{parseResult.metadata.assessed_date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">คะแนนเต็ม:</span>{" "}
                    <span className="font-medium">
                      K={parseResult.metadata.k_total} P={parseResult.metadata.p_total} A=
                      {parseResult.metadata.a_total}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold">3️⃣ ตรวจสอบข้อมูล</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  พบข้อมูล {parseResult.students.length} คน
                  {validCount < parseResult.students.length &&
                    ` (นำเข้าได้ ${validCount} คน)`}
                </p>

                {/* แจ้งเตือนรหัสที่ไม่พบ */}
                {step === "confirm" && notFoundIds.length > 0 && (
                  <Alert className="border-orange-500 bg-orange-50 mb-4">
                    <AlertDescription>
                      <p className="font-semibold mb-1">
                        ⚠️ ไม่พบรหัสนักเรียนในระบบ {notFoundIds.length} รายการ
                      </p>
                      <p className="text-sm">รายการเหล่านี้จะถูกข้ามไป ไม่นำเข้า</p>
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer font-medium">
                          ดูรายการ ({notFoundIds.length})
                        </summary>
                        <ul className="list-disc pl-5 mt-1 space-y-0.5">
                          {notFoundIds.map((id) => (
                            <li key={id}>{id}</li>
                          ))}
                        </ul>
                      </details>
                    </AlertDescription>
                  </Alert>
                )}

                {/* แจ้งเตือนข้อมูลซ้ำ */}
                {step === "confirm" && duplicateCount > 0 && (
                  <Alert className="border-blue-500 bg-blue-50 mb-4">
                    <AlertDescription>
                      <p className="font-semibold mb-1">
                        ℹ️ พบข้อมูลเดิมในระบบ {duplicateCount} รายการ
                      </p>
                      <p className="text-sm">ข้อมูลเหล่านี้จะถูกอัปเดตทับ</p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* ตาราง Preview */}
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-20">รหัส</TableHead>
                        <TableHead>ชื่อ-สกุล</TableHead>
                        <TableHead className="text-center w-16">K</TableHead>
                        <TableHead className="text-center w-16">P</TableHead>
                        <TableHead className="text-center w-16">A</TableHead>
                        <TableHead className="text-center w-20">รวม</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseResult.students.map((student, idx) => {
                        const isNotFound = notFoundIds.includes(student.student_id);
                        return (
                          <TableRow
                            key={idx}
                            className={isNotFound ? "bg-orange-50 text-muted-foreground" : ""}
                          >
                            <TableCell className="font-mono text-xs">
                              {student.student_id}
                              {isNotFound && <span className="ml-1 text-orange-500">⚠️</span>}
                            </TableCell>
                            <TableCell>{student.student_name}</TableCell>
                            <TableCell className="text-center">
                              {student.k_score}/{parseResult.metadata.k_total}
                            </TableCell>
                            <TableCell className="text-center">
                              {student.p_score}/{parseResult.metadata.p_total}
                            </TableCell>
                            <TableCell className="text-center">
                              {student.a_score}/{parseResult.metadata.a_total}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {student.score}/
                              {parseResult.metadata.k_total +
                                parseResult.metadata.p_total +
                                parseResult.metadata.a_total}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {saveError && (
                <Alert variant="destructive">
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* ขั้น 4: กำลังบันทึก */}
          {step === "saving" && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">4️⃣ กำลังบันทึก...</Label>
              <Alert className="border-blue-500 bg-blue-50">
                <AlertDescription>
                  <ul className="space-y-1 text-sm">
                    {saveProgress.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* ขั้น 5: เสร็จสิ้น */}
          {step === "done" && (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50">
                <AlertDescription>
                  <p className="font-semibold text-lg mb-2">✅ นำเข้าสำเร็จ!</p>
                  <p className="text-sm">
                    นำเข้าข้อมูล {savedCount} คน
                    {skippedCount > 0 && ` (ข้ามไป ${skippedCount} คน)`}
                  </p>
                </AlertDescription>
              </Alert>
              {saveProgress.length > 0 && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {saveProgress.map((msg, i) => (
                    <p key={i}>{msg}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "select" && (
            <Button variant="outline" onClick={handleClose}>
              ปิด
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                ยกเลิก
              </Button>
              <Button onClick={handleValidateAndPreview} disabled={!parseResult}>
                ถัดไป →
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("preview")}
                disabled={saving}
              >
                ← ย้อนกลับ
              </Button>
              <Button onClick={handleSave} disabled={saving || validCount === 0}>
                {saving
                  ? "กำลังบันทึก..."
                  : `ยืนยันนำเข้า ${validCount} คน`}
              </Button>
            </>
          )}

          {step === "saving" && (
            <Button disabled>กำลังบันทึก...</Button>
          )}

          {step === "done" && (
            <Button onClick={handleDone}>ปิด</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
