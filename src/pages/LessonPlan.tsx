import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LessonPlanForm,
  type LessonPlanConfig,
} from "@/components/lesson-plan/LessonPlanForm";
import { defaultSnapshotEquipment } from "@/components/lesson-plan/lessonPlanSnapshotConstants";
import { LessonPlanResult } from "@/components/lesson-plan/LessonPlanResult";
import { AddonPrompts } from "@/components/lesson-plan/AddonPrompts";
import { ExportDocButton } from "@/components/lesson-plan/ExportDocButton";
import { CopyWorksheetButton } from "@/components/lesson-plan/CopyWorksheetButton";
import { supabase } from "@/lib/atlasSupabase";
import { toast } from "sonner";
import { getEdgeFunctionHeaders, getAiLessonPlanUrl } from "@/lib/edgeFunctionFetch";
import { Info } from "lucide-react";

const EQUIPMENT_LABELS: Record<string, string> = {
  whiteboard: "กระดานไว / กระดานดำ",
  projector: "โปรเจกเตอร์ / จอแสดงผล",
  manipulatives: "สื่อสัมผัส (แท่ง เศษส่วน ฯลฯ)",
  computers: "คอมพิวเตอร์ / ห้องคอม",
  tablets: "แท็บเล็ต",
  limited: "อุปกรณ์จำกัด / ไม่มีห้องพิเศษ",
};

function buildReflectionContextFromLogs(
  recentLogs: {
    major_gap: string;
    mastery_score: number;
    remedial_ids: string | null;
    health_care_ids: string | null;
    topic: string | null;
  }[],
): string {
  if (!recentLogs.length) {
    return "ไม่มีข้อมูลคาบก่อนหน้า";
  }
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

  const sortedGaps = Object.entries(gapCounts).sort((a, b) => b[1] - a[1]);
  const dominantGap = sortedGaps[0] ?? ["ไม่ระบุ", 0];
  const avgMastery = (masterySum / recentLogs.length).toFixed(1);

  return `จาก ${recentLogs.length} คาบล่าสุด:
- Gap หลัก: ${dominantGap[0]} (${dominantGap[1]} ครั้ง)
- Mastery เฉลี่ย: ${avgMastery}%
- Gap Distribution: ${JSON.stringify(gapCounts)}
- Special Care IDs: ${specialIds.size > 0 ? [...specialIds].join(", ") : "ไม่มี"}
- หัวข้อล่าสุด: ${recentLogs.map((l) => l.topic).filter(Boolean).join(", ")}`;
}

function buildSnapshotPayload(config: LessonPlanConfig): Record<string, unknown> {
  const levels: string[] = [];
  if (config.snapshotStrong) levels.push("กลุ่มเด็กเรียนดี/เก่ง");
  if (config.snapshotWeak) levels.push("กลุ่มเด็กที่ต้องเสริม/อ่อน");
  if (config.snapshotBalanced) levels.push("กลุ่มเด็กระดับปานกลาง");

  const equipmentSelected = Object.entries(config.snapshotEquipment)
    .filter(([, v]) => v)
    .map(([k]) => EQUIPMENT_LABELS[k] ?? k);

  const out: Record<string, unknown> = {
    student_levels: levels,
    equipment_available: equipmentSelected,
  };

  if (config.snapshotClassNotes.trim()) {
    out.class_profile = config.snapshotClassNotes.trim();
  }
  if (config.snapshotFocusNotes.trim()) {
    out.focus = config.snapshotFocusNotes.trim();
  }

  return out;
}

function buildLessonPlanRequestBody(config: LessonPlanConfig, reflectionContext: string) {
  const base = {
    version: 2 as const,
    planType: config.planType,
    gradeLevel: config.gradeLevel,
    classroom: config.classroom,
    subject: config.subject,
    learningUnit: config.learningUnit,
    hours: config.hours,
    topic: config.topic,
    includeWorksheets: config.includeWorksheets,
  };

  if (config.generationMode === "reflection") {
    return {
      ...base,
      mode: "reflection" as const,
      context: reflectionContext,
    };
  }

  const snapshot = buildSnapshotPayload(config);
  const contextParts: string[] = [];
  if (config.snapshotClassNotes.trim()) {
    contextParts.push(`สภาพห้องและนักเรียน:\n${config.snapshotClassNotes.trim()}`);
  }
  if (config.snapshotFocusNotes.trim()) {
    contextParts.push(`จุดเน้น/ข้อจำกัด:\n${config.snapshotFocusNotes.trim()}`);
  }
  const contextCombined = contextParts.join("\n\n");

  return {
    ...base,
    mode: "context_snapshot" as const,
    context: contextCombined,
    snapshot,
  };
}

const initialLessonPlanConfig: LessonPlanConfig = {
  planType: "hourly",
  gradeLevel: "",
  classroom: "",
  subject: "",
  learningUnit: "",
  hours: 3,
  topic: "",
  includeWorksheets: false,
  generationMode: "reflection",
  snapshotStrong: false,
  snapshotWeak: false,
  snapshotBalanced: false,
  snapshotEquipment: defaultSnapshotEquipment(),
  snapshotClassNotes: "",
  snapshotFocusNotes: "",
};

export default function LessonPlan() {
  const [config, setConfig] = useState<LessonPlanConfig>(initialLessonPlanConfig);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [classrooms, setClassrooms] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const navigate = useNavigate();

  const hasLogOptions = gradeLevels.length > 0;

  useEffect(() => {
    (async () => {
      setOptionsLoading(true);
      const { data } = await supabase.from("teaching_logs").select("grade_level, classroom, subject");
      if (data) {
        setGradeLevels([...new Set(data.map((d) => d.grade_level))].sort());
        setClassrooms([...new Set(data.map((d) => d.classroom))].sort());
        setSubjects([...new Set(data.map((d) => d.subject))].sort());
      }
      setOptionsLoading(false);
    })();
  }, []);

  const generate = useCallback(async () => {
    setLoading(true);
    setContent("");

    try {
      let reflectionContext = "ไม่มีข้อมูลคาบก่อนหน้า";
      if (config.generationMode === "reflection") {
        const { data: recentLogs } = await supabase
          .from("teaching_logs")
          .select("*")
          .eq("grade_level", config.gradeLevel)
          .eq("classroom", config.classroom)
          .eq("subject", config.subject)
          .order("teaching_date", { ascending: false })
          .limit(5);

        reflectionContext = buildReflectionContextFromLogs(recentLogs ?? []);
      }

      const body = buildLessonPlanRequestBody(config, reflectionContext);

      const chatUrl = getAiLessonPlanUrl();
      if (!chatUrl) {
        toast.error("VITE_SUPABASE_URL ไม่ได้ตั้งค่าใน .env");
        return;
      }
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: await getEdgeFunctionHeaders(),
        body: JSON.stringify(body),
      });

      if (!resp.ok || !resp.body) {
        const raw = await resp.text().catch(() => "");
        const msg = (() => {
          try {
            const j = JSON.parse(raw) as { error?: string; message?: string };
            return j.error || j.message || raw;
          } catch {
            return raw;
          }
        })();
        if (resp.status === 429) {
          toast.error(msg || "คำขอมากเกินไป กรุณารอสักครู่");
          return;
        }
        if (resp.status === 402) {
          toast.error(msg || "เครดิต AI หมด");
          return;
        }
        if (resp.status === 401) {
          toast.error(msg || "เซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่");
          return;
        }
        toast.error(msg || "เกิดข้อผิดพลาดในการสร้างแผนการสอน");
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
          } catch {
            /* skip */
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการสร้างแผนการสอน");
    } finally {
      setLoading(false);
    }
  }, [config]);

  const showNoLogHint =
    !optionsLoading && !hasLogOptions && config.generationMode === "reflection";

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">สร้างแผนการสอน</h1>
          <p className="text-sm text-muted-foreground">
            {config.generationMode === "reflection"
              ? "โหมดต่อยอดบันทึก: AI อิง Teaching Logs ล่าสุดเมื่อมีข้อมูล — ถ้ายังไม่มี ให้กรอกชั้น ห้อง วิชา และหน่วยการเรียนเอง"
              : "โหมดบริบทห้อง: ระบุกลุ่มนักเรียน อุปกรณ์ และข้อความบริบท — ไม่จำเป็นต้องมีบันทึกหลังสอนในระบบ"}
          </p>
          {import.meta.env.DEV && (
            <p className="mt-2 text-[11px] font-mono text-muted-foreground border border-dashed border-primary/35 rounded-md px-2 py-1.5 bg-muted/40">
              dev: UI รุ่น lesson-plan+หน่วยเรียน+ป. — แท็บควรชื่อ &quot;ATLAS Teaching System&quot; ถ้ายังเป็น Lovable/ไม่มีช่องหน่วยการเรียน
              ให้กด Cmd+Shift+R หรือเปิด Chrome ที่ http://localhost:8080/lesson-plan
            </p>
          )}
        </div>

        {showNoLogHint && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 text-sm">
              <div className="flex gap-2 text-muted-foreground">
                <Info className="h-5 w-5 shrink-0 text-primary" />
                <span>
                  ยังไม่มีข้อมูลจากบันทึกหลังสอนในระบบ — บริบทจากคาบจึงว่างหรือจำกัด แนะนำให้บันทึกหลังสอน หรือสลับเป็นโหมด &quot;ปรับตามบริบทห้อง&quot;
                </span>
              </div>
              <Button type="button" variant="secondary" size="sm" className="shrink-0 self-start sm:self-center" onClick={() => navigate("/log")}>
                บันทึกหลังสอน
              </Button>
            </CardContent>
          </Card>
        )}

        <LessonPlanForm
          config={config}
          onChange={setConfig}
          gradeLevels={gradeLevels}
          classrooms={classrooms}
          subjects={subjects}
          hasLogOptions={hasLogOptions}
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
