/**
 * Phase D Stage 2: Upload All-in-One template (CSV/XLSX), parse, validate, upsert.
 */
import { useState, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  parseAllInOneCSV,
  parseAllInOneXLSX,
  upsertAllInOne,
  validateAllInOneRow,
  type ParsedAllInOneRow,
  type AllInOneParseResult,
  type UpsertResult,
} from "@/lib/competencyUpload";
import { Button } from "@/components/ui/button";
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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/atlasSupabase";
import { useToast } from "@/hooks/use-toast";

const BOM = "\uFEFF";

export function AllInOneImporter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [clearing, setClearing] = useState(false);
  const [parsed, setParsed] = useState<AllInOneParseResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UpsertResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParsed(null);
    setResult(null);
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (ext === "csv") {
      const text = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result ?? "").replace(BOM, ""));
        r.onerror = rej;
        r.readAsText(f, "UTF-8");
      });
      setParsed(parseAllInOneCSV(text));
    } else if (ext === "xlsx" || ext === "xls") {
      const parseResult = await parseAllInOneXLSX(f);
      setParsed(parseResult);
    } else {
      setParsed({ rows: [], errors: ["รองรับเฉพาะไฟล์ .csv หรือ .xlsx"] });
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const { validRows, validationErrors } = useMemo(() => {
    if (!parsed?.rows.length) return { validRows: [], validationErrors: [] as string[] };
    const valid: ParsedAllInOneRow[] = [];
    const errs: string[] = [];
    parsed.rows.forEach((row, i) => {
      const err = validateAllInOneRow(row, i);
      if (err) errs.push(err);
      else valid.push(row);
    });
    return { validRows: valid, validationErrors: errs };
  }, [parsed]);

  const handleUpload = useCallback(async () => {
    if (!user || validRows.length === 0) return;
    setUploading(true);
    setResult(null);
    const upsertResult = await upsertAllInOne(validRows, user.id);
    setResult(upsertResult);
    setUploading(false);
    if (upsertResult.created > 0 || upsertResult.updated > 0) {
      queryClient.invalidateQueries({ queryKey: ["smart-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["smart-report-options"] });
      queryClient.invalidateQueries({ queryKey: ["competency-student-list"] });
      queryClient.invalidateQueries({ queryKey: ["competency-student-data"] });
      queryClient.invalidateQueries({ queryKey: ["competency-filter-options"] });
    }
  }, [user, validRows, queryClient]);

  const canUpload = parsed && validRows.length > 0 && !uploading;

  const handleClearAll = useCallback(async () => {
    if (!user) return;
    setClearing(true);
    try {
      const { error } = await supabase
        .from("unit_assessments")
        .delete()
        .eq("teacher_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["smart-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["smart-report-options"] });
      queryClient.invalidateQueries({ queryKey: ["competency-student-list"] });
      queryClient.invalidateQueries({ queryKey: ["competency-student-data"] });
      queryClient.invalidateQueries({ queryKey: ["competency-filter-options"] });
      setResult(null);
      setFile(null);
      setParsed(null);
      toast({ title: "ล้างข้อมูลสำเร็จ", description: "ข้อมูลสมรรถนะทั้งหมดถูกลบแล้ว พร้อมอัปโหลดไฟล์ใหม่ได้" });
    } catch (e: unknown) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: e instanceof Error ? e.message : "ไม่สามารถลบข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  }, [user, queryClient, toast]);

  return (
    <div className="glass-card p-4 space-y-3 border-primary/30">
      <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 mb-2">
        <p className="font-semibold text-sm text-foreground">
          สมรรถนะ 8 ด้าน (หลักสูตร 2569)
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          สำหรับรายงานสมรรถนะรายบุคคล — ใช้ไฟล์ที่มีคอลัมน์ reading_score, writing_score ฯลฯ
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          คะแนนวิชา (score/total_score) รองรับหลายรูปแบบ เช่น 18/20, 8/10 — สมรรถนะต้องเป็น 1–4
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>อัปโหลดไฟล์ All-in-One ที่กรอกแล้ว (CSV หรือ XLSX)</span>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={!user || clearing}>
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              ล้างข้อมูลสมรรถนะทั้งหมด
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการล้างข้อมูล</AlertDialogTitle>
              <AlertDialogDescription>
                จะลบข้อมูลสมรรถนะ (unit_assessments) ของคุณทั้งหมด ไม่สามารถกู้คืนได้
                แนะนำให้ล้างก่อนแล้วค่อยอัปโหลดไฟล์ demo ใหม่
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                ล้างทั้งหมด
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-muted/30"
        }`}
      >
        <p className="text-sm text-muted-foreground mb-2">
          ลากไฟล์มาวางที่นี่ หรือ
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileSpreadsheet className="h-4 w-4" />
          เลือกไฟล์ CSV / XLSX
        </Button>
        {file && (
          <p className="text-sm font-medium mt-2 text-foreground">
            {file.name}
          </p>
        )}
      </div>

      {parsed && (
        <div className="space-y-2">
          {parsed.errors.length > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-sm text-amber-800 dark:text-amber-200">
              {parsed.errors.slice(0, 3).map((e, i) => (
                <div key={i}>{e}</div>
              ))}
              {parsed.errors.length > 3 && (
                <div>และอีก {parsed.errors.length - 3} รายการ</div>
              )}
            </div>
          )}
          {validationErrors.length > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">
                {validationErrors.length} แถวไม่ผ่านการตรวจสอบ:
              </p>
              {validationErrors.slice(0, 3).map((e, i) => (
                <div key={i}>{e}</div>
              ))}
              {validationErrors.length > 3 && (
                <div>และอีก {validationErrors.length - 3} รายการ</div>
              )}
            </div>
          )}
          <p className="text-sm">
            พบ <strong>{validRows.length}</strong> แถวที่พร้อมนำเข้า
            {parsed.rows.length > validRows.length && (
              <span className="text-muted-foreground"> (ข้าม {parsed.rows.length - validRows.length} แถวที่ไม่ผ่านการตรวจสอบ)</span>
            )}
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
                นำเข้า All-in-One
              </>
            )}
          </Button>
        </div>
      )}

      {result && (
        <div
          className={`rounded-lg border p-4 flex items-start gap-3 ${
            result.created === 0 && result.updated === 0
              ? "border-red-500/50 bg-red-500/10"
              : result.errors.length > 0
                ? "border-amber-500/50 bg-amber-500/10"
                : "border-emerald-500/50 bg-emerald-500/10"
          }`}
        >
          {result.created > 0 || result.updated > 0 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          )}
          <div className="text-sm">
            {result.created === 0 && result.updated === 0 ? (
              <p className="font-medium text-red-700 dark:text-red-300">
                ไม่มีการบันทึกข้อมูล กรุณาตรวจสอบข้อผิดพลาดด้านล่างและแก้ไขไฟล์ก่อนนำเข้าอีกครั้ง
              </p>
            ) : (
              <p className="font-medium">
                สร้างใหม่ <strong>{result.created}</strong> แถว — อัปเดต <strong>{result.updated}</strong> แถว
                {result.errors.length > 0 && (
                  <> — พบข้อผิดพลาด <strong>{result.errors.length}</strong> รายการ</>
                )}
              </p>
            )}
            {result.errors.length > 0 && (
              <ul className="list-disc list-inside mt-1 text-muted-foreground">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {result.errors.length > 5 && (
                  <li>และอีก {result.errors.length - 5} รายการ</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
