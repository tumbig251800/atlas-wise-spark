/**
 * Phase D Stage 2: Upload All-in-One template (CSV/XLSX), parse, validate, upsert.
 */
import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  parseAllInOneCSV,
  parseAllInOneXLSX,
  upsertAllInOne,
  type ParsedAllInOneRow,
  type AllInOneParseResult,
  type UpsertResult,
} from "@/lib/competencyUpload";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const BOM = "\uFEFF";

export function AllInOneImporter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
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

  const handleUpload = useCallback(async () => {
    if (!user || !parsed?.rows.length) return;
    setUploading(true);
    setResult(null);
    const upsertResult = await upsertAllInOne(parsed.rows as ParsedAllInOneRow[], user.id);
    setResult(upsertResult);
    setUploading(false);
    if (upsertResult.created > 0 || upsertResult.updated > 0) {
      queryClient.invalidateQueries({ queryKey: ["smart-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["smart-report-options"] });
    }
  }, [user, parsed, queryClient]);

  const canUpload = parsed && parsed.rows.length > 0 && !uploading;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Upload className="h-4 w-4" />
        <span>อัปโหลดไฟล์ All-in-One ที่กรอกแล้ว (CSV หรือ XLSX)</span>
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
                นำเข้า All-in-One
              </>
            )}
          </Button>
        </div>
      )}

      {result && (
        <div
          className={`rounded-lg border p-4 flex items-start gap-3 ${
            result.errors.length > 0 ? "border-amber-500/50 bg-amber-500/10" : "border-emerald-500/50 bg-emerald-500/10"
          }`}
        >
          {result.created > 0 || result.updated > 0 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          )}
          <div className="text-sm">
            <p className="font-medium">
              สร้างใหม่ <strong>{result.created}</strong> แถว — อัปเดต <strong>{result.updated}</strong> แถว
              {result.errors.length > 0 && (
                <> — พบข้อผิดพลาด <strong>{result.errors.length}</strong> รายการ</>
              )}
            </p>
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
