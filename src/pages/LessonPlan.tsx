import { useState, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { LessonPlanForm, type LessonPlanConfig } from "@/components/lesson-plan/LessonPlanForm";
import { LessonPlanResult } from "@/components/lesson-plan/LessonPlanResult";
import { AddonPrompts } from "@/components/lesson-plan/AddonPrompts";
import { ExportDocButton } from "@/components/lesson-plan/ExportDocButton";
import { CopyWorksheetButton } from "@/components/lesson-plan/CopyWorksheetButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function LessonPlan() {
  const { user } = useAuth();
  const [config, setConfig] = useState<LessonPlanConfig>({
    planType: "hourly",
    gradeLevel: "",
    classroom: "",
    subject: "",
    hours: 3,
    topic: "",
    includeWorksheets: false,
  });
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch unique values from teaching_logs for dropdowns
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);

  // Load filter options on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("teaching_logs")
        .select("grade_level, classroom, subject");
      if (data) {
        setGradeLevels([...new Set(data.map((d) => d.grade_level))].sort());
        setClassrooms([...new Set(data.map((d) => d.classroom))].sort());
        setSubjects([...new Set(data.map((d) => d.subject))].sort());
      }
    })();
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    setContent("");

    try {
      // Fetch last 5 logs for context
      const { data: recentLogs } = await supabase
        .from("teaching_logs")
        .select("*")
        .eq("grade_level", config.gradeLevel)
        .eq("classroom", config.classroom)
        .eq("subject", config.subject)
        .order("teaching_date", { ascending: false })
        .limit(5);

      let context = "ไม่มีข้อมูลคาบก่อนหน้า";
      if (recentLogs && recentLogs.length > 0) {
        const gapCounts: Record<string, number> = {};
        const specialIds = new Set<string>();
        let masterySum = 0;

        recentLogs.forEach((log) => {
          gapCounts[log.major_gap] = (gapCounts[log.major_gap] || 0) + 1;
          masterySum += log.mastery_score;
          if (log.remedial_ids) {
            log.remedial_ids.split(",").forEach((id) => specialIds.add(id.trim()));
          }
          if (log.health_care_ids) {
            log.health_care_ids.split(",").forEach((id) => specialIds.add(id.trim()));
          }
        });

        const dominantGap = Object.entries(gapCounts).sort((a, b) => b[1] - a[1])[0];
        const avgMastery = (masterySum / recentLogs.length).toFixed(1);

        context = `จาก ${recentLogs.length} คาบล่าสุด:
- Gap หลัก: ${dominantGap[0]} (${dominantGap[1]} ครั้ง)
- Mastery เฉลี่ย: ${avgMastery}%
- Gap Distribution: ${JSON.stringify(gapCounts)}
- Special Care IDs: ${specialIds.size > 0 ? [...specialIds].join(", ") : "ไม่มี"}
- หัวข้อล่าสุด: ${recentLogs.map((l) => l.topic).filter(Boolean).join(", ")}`;
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-lesson-plan`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          ...config,
          context,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) { toast.error("คำขอมากเกินไป กรุณารอสักครู่"); return; }
        if (resp.status === 402) { toast.error("เครดิต AI หมด"); return; }
        throw new Error("Failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              result += c;
              setContent(result);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการสร้างแผนการสอน");
    } finally {
      setLoading(false);
    }
  }, [config]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">สร้างแผนการสอน</h1>
          <p className="text-sm text-muted-foreground">
            AI จะวิเคราะห์ข้อมูลจากคาบก่อนหน้าเพื่อออกแบบแผนการสอนที่ตอบโจทย์
          </p>
        </div>

        <LessonPlanForm
          config={config}
          onChange={setConfig}
          gradeLevels={gradeLevels}
          classrooms={classrooms}
          subjects={subjects}
          onGenerate={generate}
          loading={loading}
        />

        <LessonPlanResult content={content} loading={loading} />

        {content && !loading && (
          <div className="flex flex-wrap gap-3">
            <ExportDocButton content={content} title={`แผนการสอน-${config.subject}-${config.gradeLevel}`} />
            <CopyWorksheetButton content={content} />
          </div>
        )}

        <AddonPrompts lessonContent={content} />
      </div>
    </AppLayout>
  );
}
