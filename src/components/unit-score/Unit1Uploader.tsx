/**
 * Unit1Uploader Component
 * Upload Excel roster + Unit 1 scores → preview → save to DB
 * Saves: students + unit_assessment_setups + unit_assessments
 */
import { useState, useEffect } from "react";
import { parseUnit1Excel, type Unit1ParseResult } from "@/lib/excelUnit1Parser";
import { cleanClassroomData } from "@/lib/utils";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThaiDateInput } from "@/components/ui/ThaiDateInput";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function Unit1Uploader() {
  const { user } = useAuth();
  const teacherId = user?.id;

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<Unit1ParseResult | null>(null);
  const [parsing, setParsing] = useState(false);

  // UI form state
  const [subject, setSubject] = useState("");
  const [academicTerm, setAcademicTerm] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [classroom, setClassroom] = useState("");
  const [unitName, setUnitName] = useState("หน่วยที่ 1");
  const [unitDisplayName, setUnitDisplayName] = useState("");
  const [assessedDate, setAssessedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [kTotal, setKTotal] = useState<number>(0);
  const [pTotal, setPTotal] = useState<number>(0);
  const [aTotal, setATotal] = useState<number>(0);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState<string[]>([]);

  // Auto-fill grade/classroom/topic from parseResult
  useEffect(() => {
    if (parseResult?.metadata) {
      setGradeLevel(parseResult.metadata.grade_level);
      setClassroom(parseResult.metadata.classroom);
      if (parseResult.metadata.topicName) {
        setUnitDisplayName(parseResult.metadata.topicName);
      }
    }
  }, [parseResult]);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsing(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const result = await parseUnit1Excel(selectedFile);
      setParseResult(result);
    } catch (err) {
      setParseResult({
        matchedSheets: [],
        selectedSheet: "",
        students: [],
        unit1Scores: null,
        errors: [err instanceof Error ? err.message : "อ่านไฟล์ไม่สำเร็จ"],
        warnings: [],
        metadata: {
          grade_level: "",
          classroom: "",
          totalRows: 0,
          scoresProvided: 0,
        },
      });
    } finally {
      setParsing(false);
    }
  };

  // Validation before save
  function validateBeforeSave(): string | null {
    // Check parseResult first
    if (!parseResult) {
      return "กรุณาเลือกไฟล์ Excel ก่อน";
    }

    // Check parse errors
    if ((parseResult.errors?.length ?? 0) > 0) {
      return "ไม่สามารถบันทึกได้เนื่องจากมีข้อผิดพลาดในไฟล์";
    }

    // Check auth
    if (!teacherId) {
      return "กรุณา login ก่อนบันทึก";
    }

    // Check required fields
    if (!subject.trim()) return "กรุณากรอกวิชา";
    if (!academicTerm.trim()) return "กรุณากรอกเทอม";
    if (!gradeLevel.trim()) return "กรุณากรอกชั้น";
    if (!classroom.trim()) return "กรุณากรอกห้อง";
    if (!unitName.trim()) return "กรุณากรอกหน่วย";
    if (!unitDisplayName.trim()) return "กรุณากรอกชื่อเรื่อง";
    if (!assessedDate) return "กรุณาเลือกวันที่สอบ";

    // Block future dates
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const pickedDate = new Date(assessedDate + "T00:00:00");
    if (pickedDate > today) return "วันที่สอบไม่สามารถเป็นวันในอนาคตได้";

    // Check K/P/A total vs scores
    const totalScore = kTotal + pTotal + aTotal;

    // Block if scores exist but totalScore <= 0
    if (
      parseResult.unit1Scores !== null &&
      parseResult.unit1Scores.some((s) => s.score !== null)
    ) {
      if (totalScore <= 0) {
        return "กรุณาตั้งค่าคะแนนเต็ม K + P + A ให้มากกว่า 0 ก่อนบันทึก";
      }
    }

    return null; // validation passed
  }

  // Save logic
  async function handleSave() {
    const validationError = validateBeforeSave();
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveProgress([]);
    setSaveSuccess(false);

    try {
      // Normalize values before DB operations
      const normalizedSubject = subject.trim();
      const normalizedAcademicTerm = academicTerm.trim();
      const normalizedGradeLevel = gradeLevel.trim();
      const normalizedClassroom = cleanClassroomData(classroom.trim());
      const normalizedUnitName = unitName.trim();
      const normalizedUnitDisplayName = unitDisplayName.trim();
      const totalScore = kTotal + pTotal + aTotal;

      // === STEP 1: Upsert students ===
      setSaveProgress((prev) => [...prev, "กำลังบันทึก roster..."]);

      let studentsCreated = 0;
      let studentsUpdated = 0;

      for (const student of parseResult!.students) {
        // student_code is GLOBALLY unique — look up by student_code only
        const { data: existing, error: selectErr } = await supabase
          .from("students")
          .select("id")
          .eq("student_code", student.student_code)
          .maybeSingle();

        if (selectErr) throw selectErr;

        if (existing) {
          const { error: updateErr } = await supabase
            .from("students")
            .update({
              first_name: student.first_name,
              last_name: student.last_name,
              grade_level: normalizedGradeLevel,
              classroom: normalizedClassroom,
            })
            .eq("id", existing.id);

          if (updateErr) throw updateErr;
          studentsUpdated++;
        } else {
          const { error: insertErr } = await supabase
            .from("students")
            .insert({
              teacher_id: teacherId!,
              student_id: student.student_code,
              student_code: student.student_code,
              first_name: student.first_name,
              last_name: student.last_name,
              grade_level: normalizedGradeLevel,
              classroom: normalizedClassroom,
            });

          if (insertErr) throw insertErr;
          studentsCreated++;
        }
      }

      setSaveProgress((prev) => [
        ...prev,
        `✓ บันทึก roster: ${studentsCreated} คนใหม่, ${studentsUpdated} คนอัปเดต`,
      ]);

      // === STEP 2: Upsert unit_assessment_setups ===
      setSaveProgress((prev) => [...prev, "กำลังบันทึก setup..."]);

      const { data: existingSetup, error: setupSelectErr } = await supabase
        .from("unit_assessment_setups")
        .select("id")
        .eq("teacher_id", teacherId!)
        .eq("subject", normalizedSubject)
        .eq("grade_level", normalizedGradeLevel)
        .eq("classroom", normalizedClassroom)
        .eq("academic_term", normalizedAcademicTerm)
        .eq("unit_name", normalizedUnitName)
        .maybeSingle();

      if (setupSelectErr) throw setupSelectErr;

      if (existingSetup) {
        const { error: setupUpdateErr } = await supabase
          .from("unit_assessment_setups")
          .update({
            unit_display_name: normalizedUnitDisplayName,
            assessed_date: assessedDate,
            k_total: kTotal,
            p_total: pTotal,
            a_total: aTotal,
          })
          .eq("id", existingSetup.id);

        if (setupUpdateErr) throw setupUpdateErr;
        setSaveProgress((prev) => [...prev, "✓ อัปเดต setup"]);
      } else {
        const { error: setupInsertErr } = await supabase
          .from("unit_assessment_setups")
          .insert({
            teacher_id: teacherId!,
            subject: normalizedSubject,
            grade_level: normalizedGradeLevel,
            classroom: normalizedClassroom,
            academic_term: normalizedAcademicTerm,
            unit_name: normalizedUnitName,
            unit_display_name: normalizedUnitDisplayName,
            assessed_date: assessedDate,
            k_total: kTotal,
            p_total: pTotal,
            a_total: aTotal,
          });

        if (setupInsertErr) throw setupInsertErr;
        setSaveProgress((prev) => [...prev, "✓ สร้าง setup ใหม่"]);
      }

      // === STEP 3: Upsert unit_assessments ===
      if (
        parseResult!.unit1Scores !== null &&
        parseResult!.unit1Scores.some((s) => s.score !== null) &&
        totalScore > 0
      ) {
        setSaveProgress((prev) => [...prev, "กำลังบันทึกคะแนน..."]);

        // Auto-link to latest teaching_log
        const { data: latestLog } = await supabase
          .from("teaching_logs")
          .select("id")
          .eq("teacher_id", teacherId!)
          .eq("subject", normalizedSubject)
          .eq("grade_level", normalizedGradeLevel)
          .eq("classroom", normalizedClassroom)
          .order("teaching_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        let scoresCreated = 0;
        let scoresUpdated = 0;
        let scoresSkipped = 0;

        for (const scoreRow of parseResult!.unit1Scores) {
          if (scoreRow.score === null) {
            scoresSkipped++;
            continue;
          }

          const student = parseResult!.students.find(
            (s) => s.student_code === scoreRow.student_code
          )!;
          const studentFullName = `${student.first_name} ${student.last_name}`.trim();

          const { data: existingAssessment, error: assessSelectErr } =
            await supabase
              .from("unit_assessments")
              .select("id")
              .eq("teacher_id", teacherId!)
              .eq("student_id", scoreRow.student_code)
              .eq("subject", normalizedSubject)
              .eq("grade_level", normalizedGradeLevel)
              .eq("classroom", normalizedClassroom)
              .eq("academic_term", normalizedAcademicTerm)
              .eq("unit_name", normalizedUnitName)
              .maybeSingle();

          if (assessSelectErr) throw assessSelectErr;

          if (existingAssessment) {
            // Update: preserve k_score/p_score/a_score from grid
            const { error: assessUpdateErr } = await supabase
              .from("unit_assessments")
              .update({
                student_name: studentFullName,
                score: scoreRow.score,
                total_score: totalScore,
                assessed_date: assessedDate,
                assessed_by: teacherId!,
                k_total: kTotal,
                p_total: pTotal,
                a_total: aTotal,
              })
              .eq("id", existingAssessment.id);

            if (assessUpdateErr) throw assessUpdateErr;
            scoresUpdated++;
          } else {
            // Insert: k_score/p_score/a_score = null
            const { error: assessInsertErr } = await supabase
              .from("unit_assessments")
              .insert({
                teacher_id: teacherId!,
                assessed_by: teacherId!,
                student_id: scoreRow.student_code,
                student_name: studentFullName,
                subject: normalizedSubject,
                grade_level: normalizedGradeLevel,
                classroom: normalizedClassroom,
                academic_term: normalizedAcademicTerm,
                unit_name: normalizedUnitName,
                score: scoreRow.score,
                total_score: totalScore,
                assessed_date: assessedDate,
                k_score: null,
                p_score: null,
                a_score: null,
                k_total: kTotal,
                p_total: pTotal,
                a_total: aTotal,
                reading_score: null,
                writing_score: null,
                calculating_score: null,
                sci_tech_score: null,
                social_civic_score: null,
                economy_finance_score: null,
                health_score: null,
                art_culture_score: null,
                competency_assessed_date: null,
                competency_note: null,
                teaching_log_ref: latestLog?.id || null,
              });

            if (assessInsertErr) throw assessInsertErr;
            scoresCreated++;
          }
        }

        setSaveProgress((prev) => [
          ...prev,
          `✓ บันทึกคะแนน: ${scoresCreated} คนใหม่, ${scoresUpdated} คนอัปเดต${scoresSkipped > 0 ? `, ข้าม ${scoresSkipped} คนว่าง` : ""}`,
        ]);
      } else if (parseResult!.unit1Scores === null) {
        setSaveProgress((prev) => [
          ...prev,
          "ℹ️ ไม่มีคะแนนในไฟล์ — บันทึก roster + setup เท่านั้น",
        ]);
      }

      setSaveSuccess(true);
    } catch (err) {
      console.error("Save error:", err);
      setSaveError(
        `บันทึกไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}. ` +
          `กรุณาตรวจสอบข้อมูลและลองอีกครั้ง (ข้อมูลที่บันทึกสำเร็จจะไม่หาย)`
      );
    } finally {
      setSaving(false);
    }
  }

  // Save button disabled conditions
  const totalScore = kTotal + pTotal + aTotal;
  const saveDisabled =
    saving ||
    !parseResult ||
    (parseResult.errors?.length ?? 0) > 0 ||
    !subject.trim() ||
    !academicTerm.trim() ||
    !gradeLevel.trim() ||
    !classroom.trim() ||
    !unitName.trim() ||
    !unitDisplayName.trim() ||
    !assessedDate ||
    (parseResult?.unit1Scores !== null &&
      parseResult.unit1Scores.some((s) => s.score !== null) &&
      totalScore <= 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📤 นำเข้าหน่วย 1 จาก Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. File Upload */}
          <div>
            <Label htmlFor="file-upload">1️⃣ เลือกไฟล์ Excel</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={saving}
              className="mt-2"
            />
            {parsing && (
              <p className="text-sm text-muted-foreground mt-2">
                กำลังอ่านไฟล์...
              </p>
            )}
          </div>

          {/* 2. Preview */}
          {parseResult && !parsing && (
            <div className="space-y-4">
              <h3 className="font-semibold">2️⃣ ข้อมูลจากไฟล์</h3>

              {/* Sheet info */}
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium">Sheet:</span>{" "}
                  {parseResult.selectedSheet || "-"}
                </p>
                <p>
                  <span className="font-medium">ชั้น-ห้อง:</span>{" "}
                  {parseResult.metadata.grade_level} /{" "}
                  {parseResult.metadata.classroom}
                </p>
                <p>
                  <span className="font-medium">นักเรียน:</span>{" "}
                  {parseResult.metadata.totalRows} คน
                </p>
                <p>
                  <span className="font-medium">คะแนนที่กรอก:</span>{" "}
                  {parseResult.metadata.scoresProvided} คน
                  {parseResult.metadata.totalRows >
                    parseResult.metadata.scoresProvided &&
                    ` (${parseResult.metadata.totalRows - parseResult.metadata.scoresProvided} คนว่าง)`}
                </p>
              </div>

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
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

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-semibold mb-1">❌ ข้อผิดพลาด:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {parseResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Table */}
              {parseResult.students.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">📋 ตัวอย่างข้อมูล</p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>เลขที่</TableHead>
                          <TableHead>รหัส</TableHead>
                          <TableHead>ชื่อ-สกุล</TableHead>
                          <TableHead>คะแนนหน่วย 1</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parseResult.students.slice(0, 10).map((student, i) => {
                          const scoreData = parseResult.unit1Scores?.find(
                            (s) => s.student_code === student.student_code
                          );
                          return (
                            <TableRow key={i}>
                              <TableCell>
                                {student.student_number || "-"}
                              </TableCell>
                              <TableCell>{student.student_code}</TableCell>
                              <TableCell>
                                {student.first_name} {student.last_name}
                              </TableCell>
                              <TableCell>
                                {scoreData?.score !== null &&
                                scoreData?.score !== undefined
                                  ? scoreData.score
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {parseResult.students.length > 10 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ... และอีก {parseResult.students.length - 10} คน
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Form */}
          {parseResult && parseResult.errors.length === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">3️⃣ ตั้งค่าการบันทึก</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Subject */}
                <div>
                  <Label htmlFor="subject">
                    วิชา<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="เช่น คณิตศาสตร์"
                    disabled={saving}
                  />
                </div>

                {/* Academic Term */}
                <div>
                  <Label htmlFor="academic-term">
                    เทอม<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="academic-term"
                    value={academicTerm}
                    onChange={(e) => setAcademicTerm(e.target.value)}
                    placeholder="เช่น 2/2567"
                    disabled={saving}
                  />
                </div>

                {/* Grade Level */}
                <div>
                  <Label htmlFor="grade-level">
                    ชั้น<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="grade-level"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="เช่น ป.4"
                    disabled={saving}
                  />
                </div>

                {/* Classroom */}
                <div>
                  <Label htmlFor="classroom">
                    ห้อง<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="classroom"
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    placeholder="เช่น 1"
                    disabled={saving}
                  />
                </div>

                {/* Unit Name */}
                <div>
                  <Label htmlFor="unit-name">
                    หน่วย<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="unit-name"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    disabled={saving}
                  />
                </div>

                {/* Unit Display Name */}
                <div>
                  <Label htmlFor="unit-display-name">
                    ชื่อเรื่อง<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="unit-display-name"
                    value={unitDisplayName}
                    onChange={(e) => setUnitDisplayName(e.target.value)}
                    placeholder="เช่น พลังงานและสิ่งมีชีวิต"
                    disabled={saving}
                  />
                </div>

                {/* Assessed Date */}
                <div className="col-span-2">
                  <Label htmlFor="assessed-date">
                    วันที่สอบ<span className="text-red-500">*</span>
                  </Label>
                  <ThaiDateInput
                    value={assessedDate}
                    onChange={setAssessedDate}
                    disabled={saving}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* K/P/A Totals */}
              <div>
                <Label>
                  คะแนนเต็ม (K/P/A)<span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-4 items-center mt-2">
                  <div className="flex-1">
                    <Label htmlFor="k-total" className="text-xs">
                      K
                    </Label>
                    <Input
                      id="k-total"
                      type="number"
                      min="0"
                      value={kTotal}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setKTotal(Number.isFinite(value) ? value : 0);
                      }}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="p-total" className="text-xs">
                      P
                    </Label>
                    <Input
                      id="p-total"
                      type="number"
                      min="0"
                      value={pTotal}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setPTotal(Number.isFinite(value) ? value : 0);
                      }}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="a-total" className="text-xs">
                      A
                    </Label>
                    <Input
                      id="a-total"
                      type="number"
                      min="0"
                      value={aTotal}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setATotal(Number.isFinite(value) ? value : 0);
                      }}
                      disabled={saving}
                    />
                  </div>
                  <div className="flex-1 pt-5">
                    <p className="text-sm font-medium">
                      รวม: {totalScore} คะแนน
                    </p>
                  </div>
                </div>
              </div>

              {/* Total score validation error */}
              {parseResult.unit1Scores !== null &&
                parseResult.unit1Scores.some((s) => s.score !== null) &&
                totalScore <= 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      ❌ กรุณาตั้งค่าคะแนนเต็ม K + P + A ให้มากกว่า 0 ก่อนบันทึก
                    </AlertDescription>
                  </Alert>
                )}
            </div>
          )}

          {/* 4. Save Actions */}
          {parseResult && parseResult.errors.length === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">4️⃣ บันทึก</h3>

              {/* Save Error */}
              {saveError && (
                <Alert variant="destructive">
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              {/* Save Progress */}
              {saveProgress.length > 0 && (
                <Alert className="border-blue-500 bg-blue-50">
                  <AlertDescription>
                    <ul className="space-y-1 text-sm">
                      {saveProgress.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Save Success */}
              {saveSuccess && (
                <Alert className="border-green-500 bg-green-50">
                  <AlertDescription>
                    ✅ บันทึกสำเร็จ! ข้อมูลถูกบันทึกลงระบบแล้ว
                  </AlertDescription>
                </Alert>
              )}

              {/* Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setParseResult(null);
                    setSaveSuccess(false);
                    setSaveError(null);
                    setSaveProgress([]);
                  }}
                  disabled={saving}
                >
                  ยกเลิก
                </Button>
                <Button onClick={handleSave} disabled={saveDisabled}>
                  {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
