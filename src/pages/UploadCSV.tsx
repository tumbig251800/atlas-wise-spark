import { useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { parseCSVFile, ensureISODate, type ParsedCSVRow } from "@/lib/csvImport";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";

const BOM = "\uFEFF";

export default function UploadCSV() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ rows: ParsedCSVRow[]; errors: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: number; err: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Teacher name override: auto-read from CSV, editable by anyone
  const [teacherNameOverride, setTeacherNameOverride] = useState<string>("");
  const [editingName, setEditingName] = useState(false);

  // Academic term selection (e.g. "2568-1", "2568-2")
  const currentYear = new Date().getFullYear() + 543; // Buddhist Era
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
      // Auto-detect teacher name from first row that has one
      const firstName = res.rows.find((r) => r.teacher_name)?.teacher_name ?? "";
      setTeacherNameOverride(firstName);
    };
    reader.readAsText(f, "UTF-8");
  }, []);

  const handleUpload = useCallback(async () => {
    if (!user || !parsed?.rows.length) return;

    // teacher_id is always the logged-in user (Director's UUID)
    // teacher_name comes from: override field (Director) → row's own teacher_name → null
    const teacherId = user.id;

    setUploading(true);
    setResult(null);
    const errs: string[] = [];
    let ok = 0;

    for (const row of parsed.rows) {
      const resolvedTeacherName = teacherNameOverride.trim() || row.teacher_name || null;

      // Check for duplicate before inserting
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
    }
  }, [user, parsed, queryClient, teacherNameOverride, academicTerm]);

  const canUpload = parsed && parsed.rows.length > 0 && !uploading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">อัปโหลด CSV</h1>

        <div className="glass-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            เลือกไฟล์ CSV ที่มีรูปแบบตรงกับ Export (หรือมีคอลัมน์: วันที่สอน, ระดับชั้น, ห้องเรียน, จำนวนนักเรียน, วิชา ฯลฯ)
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
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

          {/* Teacher name - auto-read from CSV, editable by anyone */}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground"
                    onClick={() => setEditingName(true)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    แก้ไข
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                อ่านจาก CSV อัตโนมัติ — กด "แก้ไข" เพื่อเปลี่ยนชื่อ
              </p>
            </div>
          )}

          {/* Academic term selector — always visible */}
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
                      {parsed.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                      {parsed.errors.length > 5 && (
                        <li>และอีก {parsed.errors.length - 5} แถว</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              <p className="text-sm">
                พบ <strong>{parsed.rows.length}</strong> แถวที่พร้อมนำเข้า
              </p>

              <Button
                onClick={handleUpload}
                disabled={!canUpload}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังนำเข้า...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    นำเข้าข้อมูล
                  </>
                )}
              </Button>
            </div>
          )}

          {result && (
            <div className={`rounded-lg border p-4 flex items-start gap-3 ${result.err.length > 0 ? "border-amber-500/50 bg-amber-500/10" : "border-emerald-500/50 bg-emerald-500/10"}`}>
              {result.ok > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              )}
              <div className="text-sm">
                <p className="font-medium">
                  นำเข้าสำเร็จ <strong>{result.ok}</strong> แถว
                </p>
                {result.err.length > 0 && (
                  <p className="text-muted-foreground mt-1">
                    ล้มเหลว {result.err.length} แถว — {result.err.slice(0, 2).join("; ")}
                    {result.err.length > 2 && " ..."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold mb-2">รูปแบบไฟล์ CSV ที่รองรับ</h3>
          <p className="text-sm text-muted-foreground mb-2">
            คอลัมน์ (ตามลำดับ): วันที่สอน, ระดับชั้น, ห้องเรียน, จำนวนนักเรียน, วิชา, หน่วยการเรียนรู้, เรื่องที่สอน,
            Mastery Score, Activity Mode, Key Issue, Major Gap, Classroom Management, Health Care Status, Health Care IDs,
            Remedial IDs, Next Strategy, สะท้อนคิด
          </p>
          <p className="text-xs text-muted-foreground">
            หมายเหตุ: จำนวนนักเรียน ไม่บังคับ (เว้นว่างได้). ใช้ไฟล์จาก Export หรือเพิ่มคอลัมน์ในไฟล์เก่าก่อนโหลด
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
