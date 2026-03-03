import { useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/atlasSupabase";
import type { Database } from "@/integrations/supabase/types";

// unit_assessments exists on atlas_prod but not in Lovable Cloud auto-generated types
const db = supabase as any;
import { parseCSVFile, ensureISODate, type ParsedCSVRow } from "@/lib/csvImport";
import { parseAssessmentCSV, type ParsedAssessmentRow } from "@/lib/assessmentImport";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Pencil, ClipboardList } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";

const BOM = "\uFEFF";

// ─── Teaching Log Tab ───────────────────────────────────────────────────────

function TeachingLogTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ rows: ParsedCSVRow[]; errors: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: number; err: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teacherNameOverride, setTeacherNameOverride] = useState<string>("");
  const [editingName, setEditingName] = useState(false);

  const currentYear = new Date().getFullYear() + 543;
  const termOptions = [
    `${currentYear}-1`,
    `${currentYear}-2`,
    `${currentYear - 1}-1`,
    `${currentYear - 1}-2`,
  ];
  const [academicTerm, setAcademicTerm] = useState<string>(`${currentYear}-1`);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setParsed(null);
    setResult(null);
    setEditingName(false);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "").replace(BOM, "");
      const res = parseCSVFile(text);
      setParsed(res);
      const firstName = res.rows.find((r) => r.teacher_name)?.teacher_name ?? "";
      setTeacherNameOverride(firstName);
    };
    reader.readAsText(f, "UTF-8");
  }, []);

  const handleUpload = useCallback(async () => {
    if (!user || !parsed?.rows.length) return;
    const teacherId = user.id;
    setUploading(true);
    setResult(null);
    const errs: string[] = [];
    let ok = 0;

    for (const row of parsed.rows) {
      const resolvedTeacherName = teacherNameOverride.trim() || row.teacher_name || null;
      const isoDate = ensureISODate(row.teaching_date);
      const { data: existing } = await supabase
        .from("teaching_logs")
        .select("id")
        .eq("teacher_id", teacherId)
        .eq("teaching_date", isoDate)
        .eq("subject", row.subject)
        .eq("grade_level", row.grade_level)
        .eq("classroom", row.classroom)
        .maybeSingle();

      if (existing) {
        errs.push(`ข้ามแถว ${row.teaching_date} ${row.subject} ${row.grade_level}/${row.classroom}: มีข้อมูลนี้อยู่แล้ว`);
        continue;
      }

      const { data: logData, error } = await supabase.from("teaching_logs").insert({
        teacher_id: teacherId,
        teaching_date: isoDate,
        grade_level: row.grade_level,
        classroom: row.classroom,
        subject: row.subject,
        learning_unit: row.learning_unit,
        topic: row.topic,
        mastery_score: row.mastery_score,
        activity_mode: row.activity_mode,
        key_issue: row.key_issue,
        major_gap: row.major_gap,
        classroom_management: row.classroom_management,
        health_care_status: row.health_care_status,
        health_care_ids: row.health_care_ids,
        total_students: row.total_students,
        remedial_ids: row.remedial_ids,
        next_strategy: row.next_strategy,
        reflection: row.reflection,
        teacher_name: resolvedTeacherName,
        academic_term: academicTerm || null,
      }).select("id").single();

      if (!error && logData?.id) {
        ok++;
        supabase.functions.invoke("atlas-diagnostic", {
          body: { logId: logData.id }
        }).catch(() => {});
        if (parsed.rows.indexOf(row) < parsed.rows.length - 1) {
          await new Promise(r => setTimeout(r, 100));
        }
      } else if (error) {
        errs.push(`แถว ${row.teaching_date} ${row.subject}: ${error.message}`);
      }
    }

    setResult({ ok, err: errs });
    setUploading(false);
    if (ok > 0) {
      queryClient.invalidateQueries({ queryKey: ["dashboard-logs"] });
      queryClient.invalidateQueries({ queryKey: ["exec-logs"] });
      queryClient.invalidateQueries({ queryKey: ["diagnostic-events"] });
      queryClient.invalidateQueries({ queryKey: ["strike-counters"] });
      queryClient.invalidateQueries({ queryKey: ["smart-logs"] });
      queryClient.invalidateQueries({ queryKey: ["smart-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["smart-report-options"] });
    }
  }, [user, parsed, queryClient, teacherNameOverride, academicTerm]);

  const canUpload = parsed && parsed.rows.length > 0 && !uploading;

  return (
    <div className="glass-card p-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        เลือกไฟล์ CSV ที่มีรูปแบบตรงกับ Export (หรือมีคอลัมน์: วันที่สอน, ระดับชั้น, ห้องเรียน, จำนวนนักเรียน, วิชา ฯลฯ)
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          เลือกไฟล์ CSV
        </Button>
        {file && (
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {file.name}
          </span>
        )}
      </div>

      {parsed && (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">ชื่อครูผู้สอน</Label>
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={teacherNameOverride}
                onChange={(e) => setTeacherNameOverride(e.target.value)}
                placeholder="พิมพ์ชื่อครู..."
                className="w-[280px] h-9 text-sm"
                autoFocus
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {teacherNameOverride || <span className="text-muted-foreground italic">ไม่พบชื่อครูใน CSV</span>}
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => setEditingName(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                แก้ไข
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">อ่านจาก CSV อัตโนมัติ — กด "แก้ไข" เพื่อเปลี่ยนชื่อ</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">ปีการศึกษา / เทอม</Label>
        <Select value={academicTerm} onValueChange={setAcademicTerm}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="เลือกเทอม" />
          </SelectTrigger>
          <SelectContent>
            {termOptions.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">ข้อมูลที่นำเข้าจะถูกแท็กด้วยเทอมนี้ เพื่อแยกวิเคราะห์ตามปีการศึกษา</p>
      </div>

      {parsed && (
        <div className="space-y-3">
          {parsed.errors.length > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">พบข้อผิดพลาดบางแถว:</p>
                <ul className="list-disc list-inside mt-1 text-amber-600 dark:text-amber-300">
                  {parsed.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  {parsed.errors.length > 5 && <li>และอีก {parsed.errors.length - 5} แถว</li>}
                </ul>
              </div>
            </div>
          )}
          <p className="text-sm">พบ <strong>{parsed.rows.length}</strong> แถวที่พร้อมนำเข้า</p>
          <Button onClick={handleUpload} disabled={!canUpload} className="gap-2">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />กำลังนำเข้า...</> : <><Upload className="h-4 w-4" />นำเข้าข้อมูล</>}
          </Button>
        </div>
      )}

      {result && (
        <div className={`rounded-lg border p-4 flex items-start gap-3 ${result.err.length > 0 ? "border-amber-500/50 bg-amber-500/10" : "border-emerald-500/50 bg-emerald-500/10"}`}>
          {result.ok > 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />}
          <div className="text-sm">
            <p className="font-medium">นำเข้าสำเร็จ <strong>{result.ok}</strong> แถว</p>
            {result.err.length > 0 && (
              <p className="text-muted-foreground mt-1">
                ล้มเหลว {result.err.length} แถว — {result.err.slice(0, 2).join("; ")}
                {result.err.length > 2 && " ..."}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="pt-2 border-t">
        <h3 className="font-semibold mb-2 text-sm">รูปแบบไฟล์ CSV ที่รองรับ</h3>
        <p className="text-xs text-muted-foreground">
          คอลัมน์: วันที่สอน, ระดับชั้น, ห้องเรียน, จำนวนนักเรียน, วิชา, หน่วยการเรียนรู้, เรื่องที่สอน,
          Mastery Score, Activity Mode, Key Issue, Major Gap, Classroom Management, Health Care Status, Health Care IDs,
          Remedial IDs, Next Strategy, สะท้อนคิด
        </p>
      </div>
    </div>
  );
}

// ─── Assessment Tab ──────────────────────────────────────────────────────────

function AssessmentTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ rows: ParsedAssessmentRow[]; errors: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: number; err: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear() + 543;
  const termOptions = [
    `${currentYear}-1`,
    `${currentYear}-2`,
    `${currentYear - 1}-1`,
    `${currentYear - 1}-2`,
  ];
  const [academicTerm, setAcademicTerm] = useState<string>(`${currentYear}-1`);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setParsed(null);
    setResult(null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "").replace(BOM, "");
      const res = parseAssessmentCSV(text);
      setParsed(res);
    };
    reader.readAsText(f, "UTF-8");
  }, []);

  const handleUpload = useCallback(async () => {
    if (!user || !parsed?.rows.length) return;
    setUploading(true);
    setResult(null);
    const errs: string[] = [];
    let ok = 0;

    for (const row of parsed.rows) {
      const termToUse = row.academic_term || academicTerm || null;

      // Duplicate check via supabase client (JWT handled automatically)
      const { data: existing, error: checkErr } = await db
        .from("unit_assessments")
        .select("id")
        .eq("teacher_id", user.id)
        .eq("student_id", row.student_id)
        .eq("subject", row.subject || "")
        .eq("grade_level", row.grade_level || "")
        .eq("classroom", row.classroom || "")
        .eq("academic_term", termToUse ?? "")
        .eq("unit_name", row.unit_name ?? "")
        .limit(1);

      if (checkErr) {
        errs.push(`นักเรียน ${row.student_id}: ${checkErr.message}`);
        continue;
      }
      if (Array.isArray(existing) && existing.length > 0) {
        errs.push(`ข้ามนักเรียน ${row.student_id} หน่วย "${row.unit_name}": มีข้อมูลนี้อยู่แล้ว`);
        continue;
      }

      // Insert via supabase client (JWT handled automatically)
      const insertPayload: any = {
        teacher_id: user.id,
        student_id: row.student_id,
        student_name: row.student_name,
        subject: row.subject || "",
        grade_level: row.grade_level || "",
        classroom: row.classroom || "",
        academic_term: termToUse,
        unit_name: row.unit_name,
        score: row.score,
        total_score: row.total_score,
        assessed_date: row.assessed_date ?? undefined,
      };

      const { error: insertErr } = await db
        .from("unit_assessments")
        .insert(insertPayload);

      if (!insertErr) {
        ok++;
      } else {
        errs.push(`นักเรียน ${row.student_id}: ${insertErr.message}`);
      }
    }

    setResult({ ok, err: errs });
    setUploading(false);
    if (ok > 0) {
      queryClient.invalidateQueries({ queryKey: ["smart-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["smart-report-options"] });
    }
  }, [user, parsed, academicTerm, queryClient]);

  const canUpload = parsed && parsed.rows.length > 0 && !uploading;

  return (
    <div className="glass-card p-6 space-y-4">
      <p className="text-sm text-muted-foreground">
        อัปโหลดคะแนนสอบหลังหน่วยการเรียนรู้ เพื่อเปรียบเทียบกับบันทึกการสอนใน Smart Report
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          เลือกไฟล์ CSV คะแนน
        </Button>
        {file && (
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {file.name}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium">ปีการศึกษา / เทอม (ค่าเริ่มต้น)</Label>
        <Select value={academicTerm} onValueChange={setAcademicTerm}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="เลือกเทอม" />
          </SelectTrigger>
          <SelectContent>
            {termOptions.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">ใช้เป็นค่าเริ่มต้นถ้าไฟล์ CSV ไม่มีคอลัมน์ "เทอม"</p>
      </div>

      {parsed && (
        <div className="space-y-3">
          {parsed.errors.length > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">พบข้อผิดพลาดบางแถว:</p>
                <ul className="list-disc list-inside mt-1 text-amber-600 dark:text-amber-300">
                  {parsed.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  {parsed.errors.length > 5 && <li>และอีก {parsed.errors.length - 5} แถว</li>}
                </ul>
              </div>
            </div>
          )}
          <p className="text-sm">พบ <strong>{parsed.rows.length}</strong> แถวที่พร้อมนำเข้า</p>
          <Button onClick={handleUpload} disabled={!canUpload} className="gap-2">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" />กำลังนำเข้า...</> : <><Upload className="h-4 w-4" />นำเข้าคะแนน</>}
          </Button>
        </div>
      )}

      {result && (
        <div className={`rounded-lg border p-4 flex items-start gap-3 ${result.err.length > 0 ? "border-amber-500/50 bg-amber-500/10" : "border-emerald-500/50 bg-emerald-500/10"}`}>
          {result.ok > 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />}
          <div className="text-sm">
            <p className="font-medium">นำเข้าสำเร็จ <strong>{result.ok}</strong> แถว</p>
            {result.err.length > 0 && (
              <p className="text-muted-foreground mt-1">
                ล้มเหลว {result.err.length} แถว — {result.err.slice(0, 2).join("; ")}
                {result.err.length > 2 && " ..."}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="pt-2 border-t">
        <h3 className="font-semibold mb-2 text-sm">รูปแบบไฟล์ CSV คะแนนประเมิน</h3>
        <p className="text-xs text-muted-foreground mb-1">
          คอลัมน์ที่รองรับ (ชื่อภาษาไทยหรืออังกฤษ):
        </p>
        <div className="text-xs text-muted-foreground font-mono bg-muted/40 rounded p-2">
          รหัสนักเรียน, คะแนน, คะแนนเต็ม, วิชา, ระดับชั้น, ห้องเรียน, เทอม, หน่วยการเรียนรู้, วันที่สอบ
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          คอลัมน์บังคับ: <strong>รหัสนักเรียน</strong> และ <strong>คะแนน</strong> — คอลัมน์อื่นเว้นว่างได้
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function UploadCSV() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">อัปโหลด CSV</h1>

        <Tabs defaultValue="teaching-log">
          <TabsList className="mb-4">
            <TabsTrigger value="teaching-log" className="gap-2">
              <FileText className="h-4 w-4" />
              บันทึกการสอน
            </TabsTrigger>
            <TabsTrigger value="assessment" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              คะแนนประเมิน
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teaching-log">
            <TeachingLogTab />
          </TabsContent>

          <TabsContent value="assessment">
            <AssessmentTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
