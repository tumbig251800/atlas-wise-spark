import { useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { parseCSVFile, type ParsedCSVRow } from "@/lib/csvImport";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const BOM = "\uFEFF";

export default function UploadCSV() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ rows: ParsedCSVRow[]; errors: string[] } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ ok: number; err: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setParsed(null);
    setResult(null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "").replace(BOM, "");
      const res = parseCSVFile(text);
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
      const { error } = await supabase.from("teaching_logs").insert({
        teacher_id: user.id,
        teaching_date: row.teaching_date,
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
      });
      if (error) errs.push(`แถว ${row.teaching_date} ${row.subject}: ${error.message}`);
      else ok++;
    }

    setResult({ ok, err: errs });
    setUploading(false);
    if (ok > 0) {
      queryClient.invalidateQueries({ queryKey: ["dashboard-logs"] });
      queryClient.invalidateQueries({ queryKey: ["exec-logs"] });
      queryClient.invalidateQueries({ queryKey: ["diagnostic-events"] });
      queryClient.invalidateQueries({ queryKey: ["strike-counters"] });
    }
  }, [user, parsed, queryClient]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">อัปโหลด CSV</h1>

        <div className="glass-card p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            เลือกไฟล์ CSV ที่มีรูปแบบตรงกับ Export (หรือมีคอลัมน์: วันที่สอน, ระดับชั้น, ห้องเรียน, จำนวนนักเรียน, วิชา ฯลฯ)
            ข้อมูลจะถูกนำเข้าภายใต้บัญชีของคุณ
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
                disabled={uploading || parsed.rows.length === 0}
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
