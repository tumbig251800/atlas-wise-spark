import { useState, useEffect, useCallback } from "react";
import { cleanClassroomData } from "@/lib/utils";
import { AppLayout } from "@/components/AppLayout";
import { StepProgress } from "@/components/teaching-log/StepProgress";
import { Step1General } from "@/components/teaching-log/Step1General";
import { Step2Quality } from "@/components/teaching-log/Step2Quality";
import { Step3Gap } from "@/components/teaching-log/Step3Gap";
import { Step4Action } from "@/components/teaching-log/Step4Action";
import { PreSubmitSummary } from "@/components/teaching-log/PreSubmitSummary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";

export interface TeachingLogForm {
  teachingDate: string;
  gradeLevel: string;
  classroom: string;
  subject: string;
  learningUnit: string;
  topic: string;
  totalStudents: number | null;
  masteryScore: number | null;
  activityMode: "active" | "passive" | "constructive" | null;
  keyIssue: string;
  majorGap: "k-gap" | "p-gap" | "a-gap" | "a2-gap" | "system-gap" | "success" | null;
  classroomManagement: string;
  classroomManagementOther: string;
  healthCareStatus: "" | "none" | "has";
  healthCareIds: string;
  remedialIds: string;
  remedialStatuses: Record<string, "pass" | "stay">;
  nextStrategy: string;
  reflection: string;
}

const INITIAL_FORM: TeachingLogForm = {
  teachingDate: new Date().toISOString().split("T")[0],
  gradeLevel: "",
  classroom: "",
  subject: "",
  learningUnit: "",
  topic: "",
  totalStudents: null,
  masteryScore: null,
  activityMode: null,
  keyIssue: "",
  majorGap: null,
  classroomManagement: "",
  classroomManagementOther: "",
  healthCareStatus: "",
  healthCareIds: "",
  remedialIds: "",
  remedialStatuses: {},
  nextStrategy: "",
  reflection: "",
};

const SMART_PERSIST_KEY = "atlas_smart_persist";
const DRAFT_KEY = "atlas_draft_log";

export default function TeachingLog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<TeachingLogForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [teacherName, setTeacherName] = useState("");

  // Fetch teacher name from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setTeacherName(data.full_name);
      });
  }, [user]);

  // Load draft & smart persist on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    const persist = localStorage.getItem(SMART_PERSIST_KEY);
    let loaded = { ...INITIAL_FORM };
    if (persist) {
      try {
        const p = JSON.parse(persist);
        loaded = { ...loaded, ...p };
      } catch {}
    }
    if (draft) {
      try {
        const d = JSON.parse(draft);
        loaded = { ...loaded, ...d };
      } catch {}
    }
    setForm(loaded);
  }, []);

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const handleChange = useCallback((field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validateStep = (step: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!form.gradeLevel) errs.gradeLevel = "กรุณาเลือกระดับชั้น";
      if (!form.classroom.trim()) errs.classroom = "กรุณากรอกห้องเรียน";
      if (!form.subject.trim()) errs.subject = "กรุณากรอกวิชา";
      if (!form.learningUnit.trim()) errs.learningUnit = "กรุณากรอกหน่วยการเรียนรู้";
      if (!form.topic.trim()) errs.topic = "กรุณากรอกเรื่องที่สอน";
      if (!form.totalStudents || form.totalStudents < 1) errs.totalStudents = "กรุณากรอกจำนวนนักเรียน";
    } else if (step === 2) {
      if (!form.masteryScore) errs.masteryScore = "กรุณาเลือกคะแนน";
      if (!form.activityMode) errs.activityMode = "กรุณาเลือก Activity Mode";
      if (!form.keyIssue.trim()) errs.keyIssue = "กรุณาระบุปัญหาหลัก";
    } else if (step === 3) {
      if (!form.majorGap) errs.majorGap = "กรุณาเลือก Major Gap";
      if (!form.classroomManagement) errs.classroomManagement = "กรุณาเลือกสถานะการจัดการชั้นเรียน";
      if (form.classroomManagement === "อื่นๆ (โปรดระบุ)" && !form.classroomManagementOther.trim()) {
        errs.classroomManagementOther = "กรุณาระบุรายละเอียด";
      }
      if (!form.healthCareStatus) errs.healthCareStatus = "กรุณาเลือกสถานะสุขภาพ";
      if (form.healthCareStatus === "has" && !form.healthCareIds.trim()) errs.healthCareIds = "กรุณาระบุรหัสนักเรียน";
    } else if (step === 4) {
      if (!form.remedialIds.trim()) errs.remedialIds = "กรุณาระบุรหัสนักเรียน";
      // Validate remedial statuses - every student must have a status
      if (form.remedialIds.trim()) {
        const ids = form.remedialIds.split(",").map(id => id.trim()).filter(Boolean);
        const allHaveStatus = ids.every(id => form.remedialStatuses[id]);
        if (!allHaveStatus) errs.remedialStatuses = "กรุณาเลือกสถานะ PASS/STAY ทุกคน";
      }
      if (!form.nextStrategy) errs.nextStrategy = "กรุณาเลือกกลยุทธ์";
      if (!form.reflection.trim()) errs.reflection = "กรุณากรอกสะท้อนคิด";
    }
    return errs;
  };

  const validate = (): boolean => {
    const errs = validateStep(currentStep);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setTimeout(() => {
        document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
    return Object.keys(errs).length === 0;
  };

  const validateAll = (): { valid: boolean; failedStep: number | null } => {
    for (let step = 1; step <= 4; step++) {
      const errs = validateStep(step);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        setCurrentStep(step);
        setTimeout(() => {
          document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        return { valid: false, failedStep: step };
      }
    }
    setErrors({});
    return { valid: true, failedStep: null };
  };

  const handleNext = () => {
    if (validate()) {
      if (currentStep === 1) {
        localStorage.setItem(SMART_PERSIST_KEY, JSON.stringify({
          gradeLevel: form.gradeLevel,
          classroom: form.classroom,
          subject: form.subject,
        }));
      }
      setCurrentStep((s) => Math.min(s + 1, 4));
    }
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const handlePreSubmit = () => {
    const { valid } = validateAll();
    if (valid) {
      setShowSummary(true);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "กรุณาเข้าสู่ระบบ", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const cleanedClassroom = cleanClassroomData(form.classroom.trim());
      const { data: logData, error } = await supabase.from("teaching_logs").insert({
        teacher_id: user.id,
        teacher_name: teacherName || null,
        teaching_date: form.teachingDate,
        grade_level: form.gradeLevel,
        classroom: cleanedClassroom,
        subject: form.subject.trim(),
        learning_unit: form.learningUnit.trim() || null,
        topic: form.topic.trim() || null,
        mastery_score: form.masteryScore!,
        activity_mode: form.activityMode!,
        key_issue: form.keyIssue.trim() || null,
        major_gap: form.majorGap!,
        classroom_management: form.classroomManagement === "อื่นๆ (โปรดระบุ)"
          ? `อื่นๆ: ${form.classroomManagementOther.trim()}`
          : form.classroomManagement || null,
        health_care_status: form.healthCareStatus === "has",
        health_care_ids: form.healthCareStatus === "none" ? "[None]" : form.healthCareIds.trim() || null,
        total_students: form.totalStudents,
        remedial_ids: form.remedialIds.trim() || null,
        next_strategy: form.nextStrategy || null,
        reflection: form.reflection.trim() || null,
      }).select("id").single();

      if (error) throw error;

      // Call diagnostic engine asynchronously (don't block submit)
      if (logData?.id) {
        supabase.functions.invoke("atlas-diagnostic", {
          body: {
            logId: logData.id,
            remedialStatuses: Object.entries(form.remedialStatuses).map(
              ([studentId, status]) => ({ studentId, status })
            ),
          },
        }).catch((err) => console.error("Diagnostic engine error:", err));
      }

      toast({ title: "✅ บันทึกสำเร็จ!", description: "ข้อมูลการสอนถูกบันทึกเรียบร้อยแล้ว" });
      setShowSummary(false);
      localStorage.removeItem(DRAFT_KEY);

      const persist = localStorage.getItem(SMART_PERSIST_KEY);
      let resetForm = { ...INITIAL_FORM };
      if (persist) {
        try { resetForm = { ...resetForm, ...JSON.parse(persist) }; } catch {}
      }
      setForm(resetForm);
      setCurrentStep(1);
    } catch (err: any) {
      toast({ title: "❌ เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">📝 บันทึกหลังสอน</h1>

        <StepProgress currentStep={currentStep} />

        <div className="glass-card p-6">
          {currentStep === 1 && <Step1General data={form} onChange={handleChange} errors={errors} teacherName={teacherName} />}
          {currentStep === 2 && <Step2Quality data={form} onChange={handleChange} errors={errors} />}
          {currentStep === 3 && <Step3Gap data={form} onChange={handleChange} errors={errors} masteryScore={form.masteryScore} />}
          {currentStep === 4 && <Step4Action data={form} onChange={handleChange} errors={errors} masteryScore={form.masteryScore} totalStudents={form.totalStudents} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
            <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
          </Button>

          {currentStep < 4 ? (
            <Button onClick={handleNext}>
              ถัดไป <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handlePreSubmit} disabled={submitting} className="bg-[hsl(var(--atlas-success))] hover:bg-[hsl(var(--atlas-success))]/90">
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              บันทึก
            </Button>
          )}
        </div>
      </div>

      <PreSubmitSummary
        open={showSummary}
        onClose={() => setShowSummary(false)}
        onConfirm={handleSubmit}
        form={form}
        submitting={submitting}
      />
    </AppLayout>
  );
}
