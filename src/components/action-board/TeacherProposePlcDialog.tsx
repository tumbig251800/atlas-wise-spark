import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/atlasSupabase";
import { useCreateTeacherPlc } from "@/hooks/useCreateTeacherPlc";
import { CaseStudentPicker } from "@/components/action-board/CaseStudentPicker";
import type { ActionItem } from "@/hooks/useActionItems";

const SEVERITY_OPTIONS: { value: "critical" | "high" | "medium"; label: string }[] = [
  { value: "critical", label: "🔴 รุนแรงมาก — ต้องแก้ด่วน" },
  { value: "high", label: "🟠 รุนแรง — ควรแก้เร็ว" },
  { value: "medium", label: "🟡 ปานกลาง — ติดตามได้" },
];

/**
 * "เปิด PLC เอง" — teacher-proposed PLC (bottom-up).
 *
 * Two modes:
 *  - teacher (default): the teacher opens a case on their own class, then picks
 *    the students in-flow (their own roster — allowed by RLS).
 *  - leadership (`leadership`): a director/lead/admin opens a case ON BEHALF OF a
 *    teacher. They pick the teacher + frame the problem; the teacher then scopes
 *    the students later from their own view (student-linking is a roster-owner
 *    action, so leadership deliberately stops at framing the case).
 *
 * Class/subject options come from the target teacher's own roster & score data so
 * the student picker always finds the right roster.
 */
export function TeacherProposePlcDialog({
  leadership = false,
  teacherId,
  teacherName,
}: {
  leadership?: boolean;
  teacherId?: string | null;
  teacherName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "students">("form");
  const [created, setCreated] = useState<ActionItem | null>(null);

  const [selectedTeacher, setSelectedTeacher] = useState(""); // leadership: profiles.user_id
  const [problem, setProblem] = useState("");
  const [gradeClassroom, setGradeClassroom] = useState(""); // "grade|classroom"
  const [subject, setSubject] = useState("");
  const [severity, setSeverity] = useState<"critical" | "high" | "medium">("high");

  const create = useCreateTeacherPlc();

  // leadership: the staff directory of teachers to open a case for.
  const { data: teachers } = useQuery({
    queryKey: ["propose-teacher-list"],
    enabled: open && leadership,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("role", "teacher")
        .order("full_name");
      if (error) throw error;
      return (data ?? []).filter((r) => !!r.user_id);
    },
  });

  const effectiveTeacherId = leadership ? selectedTeacher : teacherId ?? "";
  const effectiveTeacherName = leadership
    ? teachers?.find((t) => t.user_id === selectedTeacher)?.full_name ?? null
    : teacherName ?? null;

  // The target teacher's own classes (grade/classroom) — so the roster picker is populated.
  const { data: classes } = useQuery({
    queryKey: ["teacher-classes", effectiveTeacherId],
    enabled: open && !!effectiveTeacherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("grade_level, classroom")
        .eq("teacher_id", effectiveTeacherId);
      if (error) throw error;
      const seen = new Set<string>();
      const out: { grade: string; classroom: string }[] = [];
      for (const r of data ?? []) {
        if (!r.grade_level || !r.classroom) continue;
        const key = `${r.grade_level}|${r.classroom}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ grade: r.grade_level, classroom: r.classroom });
      }
      return out.sort((a, b) => `${a.grade}${a.classroom}`.localeCompare(`${b.grade}${b.classroom}`));
    },
  });

  // The target teacher's own subjects (from unit scores).
  const { data: subjects } = useQuery({
    queryKey: ["teacher-subjects", effectiveTeacherId],
    enabled: open && !!effectiveTeacherId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_assessments")
        .select("subject")
        .eq("teacher_id", effectiveTeacherId);
      if (error) throw error;
      return [...new Set((data ?? []).map((r) => r.subject).filter(Boolean) as string[])].sort();
    },
  });

  const [grade, classroom] = useMemo(() => gradeClassroom.split("|"), [gradeClassroom]);
  const canSubmit =
    !!effectiveTeacherId &&
    problem.trim().length >= 5 &&
    !!grade &&
    !!classroom &&
    !!subject &&
    !create.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    const item = await create.mutateAsync({
      problem,
      gradeLevel: grade,
      classroom,
      subject,
      severity,
      teacherId: effectiveTeacherId,
      teacherName: effectiveTeacherName,
    });
    if (leadership) {
      // leadership frames the case; the teacher scopes students from their own view.
      handleOpenChange(false);
    } else {
      setCreated(item);
      setStep("students");
    }
  };

  const reset = () => {
    setStep("form");
    setCreated(null);
    setSelectedTeacher("");
    setProblem("");
    setGradeClassroom("");
    setSubject("");
    setSeverity("high");
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusCircle className="h-4 w-4 mr-1" /> {leadership ? "เปิด PLC ให้ครู" : "เปิด PLC เอง"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {leadership ? "เปิด PLC ให้ครู (ผู้บริหาร)" : "เปิด PLC จากปัญหาของครูเอง"}
          </DialogTitle>
          <DialogDescription>
            {step === "students"
              ? "เลือกนักเรียนที่อยู่ในปัญหานี้ (ระบบแนะนำเด็ก Red Zone ไว้ให้)"
              : leadership
              ? "เลือกครูและระบุปัญหาที่จะนำเข้ากระบวนการ PLC — จากนั้นครูจะเลือกนักเรียนเองในหน้าของครู"
              : "ระบุปัญหาที่อยากนำเข้ากระบวนการ PLC — ผู้บริหารจะร่วมพิจารณาและช่วยวิเคราะห์ก่อนยืนยันเป็นเคสจริง"}
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4">
            {leadership && (
              <div className="space-y-1.5">
                <Label>ครูเจ้าของเคส</Label>
                <Select
                  value={selectedTeacher}
                  onValueChange={(v) => {
                    setSelectedTeacher(v);
                    setGradeClassroom("");
                    setSubject("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกครู" />
                  </SelectTrigger>
                  <SelectContent>
                    {(teachers ?? []).map((t) => (
                      <SelectItem key={t.user_id} value={t.user_id}>
                        {t.full_name || t.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tp-problem">ปัญหา / ประเด็นที่พบ</Label>
              <Textarea
                id="tp-problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="เช่น นักเรียนหลายคนอ่านจับใจความไม่ได้หลังเปลี่ยนหน่วยการเรียนรู้ใหม่"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>ชั้น / ห้อง</Label>
                <Select
                  value={gradeClassroom}
                  onValueChange={setGradeClassroom}
                  disabled={leadership && !selectedTeacher}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกห้อง" />
                  </SelectTrigger>
                  <SelectContent>
                    {(classes ?? []).map((c) => (
                      <SelectItem key={`${c.grade}|${c.classroom}`} value={`${c.grade}|${c.classroom}`}>
                        {c.grade}/{c.classroom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>วิชา</Label>
                <Select value={subject} onValueChange={setSubject} disabled={leadership && !selectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิชา" />
                  </SelectTrigger>
                  <SelectContent>
                    {(subjects ?? []).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ความรุนแรง</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!!effectiveTeacherId && (classes ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">
                ยังไม่พบห้องเรียนของครูคนนี้ในระบบ — ต้องมีรายชื่อนักเรียน (เมนู "บันทึกคะแนนหน่วย") ก่อน
              </p>
            )}

            <div className="flex items-start gap-2 rounded-md bg-primary/5 p-2.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              {leadership
                ? "หลังเปิดเคส ครูจะเห็นเคสนี้ในหน้าของตน เลือกนักเรียน และร่วมยืนยันเป็นเคสจริง จากนั้น AI ช่วยร่างแนวทางแก้"
                : "หลังเปิดเคส ระบบ AI จะช่วยวิเคราะห์สาเหตุ และผู้บริหารร่วมพิจารณา ก่อนยืนยันเป็นเคสจริง จากนั้น AI จะร่างแนวทางแก้ให้ตรงบริบท (ครูปรับแก้ได้)"}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button onClick={submit} disabled={!canSubmit}>
                {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {leadership ? "เปิดเคสให้ครู" : "เปิดเคส & เลือกนักเรียน"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {created && <CaseStudentPicker item={created} />}
            <div className="flex justify-end">
              <Button onClick={() => handleOpenChange(false)}>เสร็จสิ้น</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
