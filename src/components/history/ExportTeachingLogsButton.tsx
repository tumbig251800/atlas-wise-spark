import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ExportTeachingLogsButtonProps {
  teachers?: string[];
  subjects?: string[];
  grades?: string[];
  classrooms?: string[];
  terms?: string[];
}

export function ExportTeachingLogsButton({
  teachers = [],
  subjects = [],
  grades = [],
  classrooms = [],
  terms = [],
}: ExportTeachingLogsButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Form state
  const [teacherName, setTeacherName] = useState(profile?.full_name || "");
  const [term, setTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [classroom, setClassroom] = useState("");

  // Preview count
  const handlePreview = async () => {
    if (!teacherName) {
      toast({
        title: "กรุณาเลือกครู",
        description: "ต้องระบุชื่อครูเพื่อดูจำนวนบันทึก",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call MCP tool to get count
      const response = await fetch("/api/mcp/atlas_teaching_logs_by_teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_name: teacherName,
          term,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          subject: subject || undefined,
          grade: grade || undefined,
          classroom: classroom || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch preview");

      const data = await response.json();
      setPreviewCount(data.total_logs || 0);
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดูตัวอย่างจำนวนบันทึกได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Export function
  const handleExport = async () => {
    if (!teacherName) {
      toast({
        title: "กรุณาเลือกครู",
        description: "ต้องระบุชื่อครูเพื่อ export ข้อมูล",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call MCP tool
      const response = await fetch("/api/mcp/atlas_teaching_logs_by_teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_name: teacherName,
          term,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          subject: subject || undefined,
          grade: grade || undefined,
          classroom: classroom || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to export");

      const data = await response.json();

      // Generate text file
      const content = generateTextFile(data);

      // Download
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlas-${teacherName}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export สำเร็จ",
        description: `ดาวน์โหลดบันทึก ${data.total_logs} รายการแล้ว`,
      });

      setOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถ export ข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate text file content
  const generateTextFile = (data: any): string => {
    const { teacher_name, filters, total_logs, logs } = data;

    let content = "ATLAS - บันทึกหลังสอนของฉัน\n";
    content += `ครู: ${teacher_name}\n`;
    content += `จำนวนรายการ: ${total_logs}\n`;
    content += `ภาคเรียน: ${filters.term}\n`;
    content += `ช่วงวันที่: ${filters.date_from} ถึง ${filters.date_to}\n`;
    content += `วิชา: ${filters.subject}\n`;
    content += `ระดับชั้น/ห้อง: ${filters.grade} / ${filters.classroom}\n`;
    content += `\n`;

    logs.forEach((log: any, index: number) => {
      content += `รายการที่ ${index + 1}\n`;
      content += `วันที่สอน: ${formatThaiDate(log.teaching_date)}\n`;
      content += `วิชา: ${log.subject || "-"}\n`;
      content += `ระดับชั้น/ห้อง: ${log.grade_level} / ${log.classroom}\n`;
      content += `หน่วยการเรียนรู้: ${log.unit_name || "-"}\n`;
      content += `หัวข้อ: ${log.topic || "-"}\n`;
      content += `จำนวนนักเรียน: ${log.student_count || "-"}\n`;
      content += `Mastery: ${log.mastery_score || "-"}/5\n`;
      content += `Gap: ${capitalizeGap(log.major_gap)}\n`;
      content += `รูปแบบกิจกรรม: ${formatActivityLevel(log.activity_mode)}\n`;
      content += `Key Issue: ${log.key_issue || "-"}\n`;
      content += `Next Strategy: ${log.next_strategy || "-"}\n`;
      if (log.remedial_ids && log.remedial_ids !== '[None]') {
        content += `นักเรียนซ่อมเสริม: ${log.remedial_ids}\n`;
      }
      if (log.health_care_ids && log.health_care_ids !== '[None]') {
        content += `Health Care: ${log.health_care_ids}\n`;
      }
      if (log.health_care_status) {
        content += `SC Status: ${log.health_care_status}\n`;
      }
      if (log.classroom_management) {
        content += `Classroom Mgmt: ${log.classroom_management}\n`;
      }
      content += `Reflection: ${log.reflection || "-"}\n`;
      content += `\n------------------------------\n`;
    });

    return content;
  };

  const formatThaiDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const capitalizeGap = (gap: string) => {
    const map: Record<string, string> = {
      success: "Success",
      "k-gap": "K-Gap",
      "p-gap": "P-Gap",
      "a-gap": "A-Gap",
      "a2-gap": "A2-Gap",
      "system-gap": "System-Gap",
    };
    return map[gap] || gap;
  };

  const formatActivityLevel = (level: string) => {
    const map: Record<string, string> = {
      passive: "Passive (Level 1)",
      active: "Active (Level 2)",
      constructive: "Constructive (Level 3)",
    };
    return map[level] || level;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export บันทึกการสอน
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Export บันทึกการสอน</DialogTitle>
          <DialogDescription>
            เลือกตัวกรองเพื่อ export บันทึกการสอนเฉพาะของคุณ
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Teacher Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="teacher" className="text-right">
              ครู <span className="text-red-500">*</span>
            </Label>
            <div className="col-span-3">
              {teachers.length > 0 ? (
                <Select value={teacherName} onValueChange={setTeacherName}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกครู" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="teacher"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="ชื่อครู"
                />
              )}
            </div>
          </div>

          {/* Term */}
          {terms.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="term" className="text-right">
                ภาคเรียน
              </Label>
              <div className="col-span-3">
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ทั้งหมด</SelectItem>
                    {terms.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">ช่วงวันที่</Label>
            <div className="col-span-3 flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="จาก"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="ถึง"
              />
            </div>
          </div>

          {/* Subject */}
          {subjects.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                วิชา
              </Label>
              <div className="col-span-3">
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="ทั้งหมด" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ทั้งหมด</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Grade & Classroom */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">ระดับชั้น/ห้อง</Label>
            <div className="col-span-3 flex gap-2">
              {grades.length > 0 && (
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="ชั้น" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ทั้งหมด</SelectItem>
                    {grades.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {classrooms.length > 0 && (
                <Select value={classroom} onValueChange={setClassroom}>
                  <SelectTrigger>
                    <SelectValue placeholder="ห้อง" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ทั้งหมด</SelectItem>
                    {classrooms.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Preview Count */}
          {previewCount !== null && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-blue-800">
                พบบันทึก <strong>{previewCount}</strong> รายการ
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={loading || !teacherName}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <FileText className="w-4 h-4 mr-2" />
            ดูจำนวน
          </Button>
          <Button onClick={handleExport} disabled={loading || !teacherName}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
