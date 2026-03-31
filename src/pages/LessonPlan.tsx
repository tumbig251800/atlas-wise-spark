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
import { getAiLessonPlanUrl, streamEdgeContent } from "@/lib/edgeFunctionFetch";
import {
  buildLessonPlanRequestBody,
  buildReflectionContextFromLogs,
} from "@/domain/lessonPlanRequest";
import { Info } from "lucide-react";

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
      let result = "";
      await streamEdgeContent(chatUrl, body, (chunk) => {
        result += chunk;
        setContent(result);
      });
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการสร้างแผนการสอน";
      toast.error(msg);
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
