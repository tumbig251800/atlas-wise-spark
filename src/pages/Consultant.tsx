import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Loader2, Filter, FileQuestion, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useDashboardData, loadPersistedFilters, getPersistedFiltersFromStorage, persistFilters } from "@/hooks/useDashboardData";
import { useDiagnosticData, type DiagnosticFilter } from "@/hooks/useDiagnosticData";
import { buildStrictAnswerTH, type DecisionObject } from "@/lib/atlasStrictNarrator";
import { validateContextBeforeAI } from "@/lib/contextValidator";
import { getEdgeFunctionHeaders, getAiChatUrl, getAiExamGenUrl, getAiExamGenHeaders } from "@/lib/edgeFunctionFetch";

type Msg = { id: string; role: "user" | "assistant"; content: string };

type SSEChunk = { choices?: Array<{ delta?: { content?: string } }> };
type DecisionEventLike = { decision_object?: unknown; student_id?: string | null };

function genMsgId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function buildQwrMetricsBlock(logs: { mastery_score: number }[]): string {
  // Align with Dashboard QWRTrendChart.tsx:
  // baseline = first 20% sessions, current = last 20% sessions (logs are ordered by teaching_date asc).
  if (logs.length < 5) {
    return `\n\n## [QWR METRICS]\nข้อมูลยังไม่เพียงพอ (ต้องมีอย่างน้อย 5 คาบ)`;
  }

  const n = logs.length;
  const baselineSlice = logs.slice(0, Math.ceil(n * 0.2));
  const currentSlice = logs.slice(Math.floor(n * 0.8));

  const baselineAvg = mean(baselineSlice.map((l) => l.mastery_score));
  const currentAvg = mean(currentSlice.map((l) => l.mastery_score));
  const velocity = currentAvg - baselineAvg;
  const velocityPct = ((velocity / 5) * 100).toFixed(1);

  return `\n\n## [QWR METRICS]\nGrowth Velocity: ${velocityPct}%\nBaseline Avg: ${baselineAvg.toFixed(2)}\nCurrent Avg: ${currentAvg.toFixed(2)}\nจำนวนคาบ: ${n}\n\n[STRICT]\n- หากกล่าวถึง Growth Velocity / Baseline / Current ต้องอ้างอิงจากบล็อก [QWR METRICS] นี้เท่านั้น\n- ห้ามสร้างตัวเลข QWR เองเด็ดขาด`;
}

function buildContextWithCitation(
  logs: { teaching_date: string; subject: string; grade_level: string; classroom: string | number; topic?: string; mastery_score: number; major_gap: string; key_issue?: string; next_strategy?: string; remedial_ids?: string; total_students?: number }[]
): string {
  if (logs.length === 0) return "ไม่พบข้อมูลการสอนที่ตรงกับเงื่อนไข";
  
  const slice = logs.slice(-10);
  const sessionDetails = slice.map((l, index) => {
    const refId = `[REF-${index + 1}]`;
    const remedialCount = (l.remedial_ids || "").split(",").filter(x => x.trim() && x !== "[None]" && x !== "[N/A]").length;
    return `${refId} วันที่: ${l.teaching_date} | วิชา: ${l.subject} | ห้อง: ${l.grade_level}/${l.classroom} | หัวข้อ: ${l.topic || "ไม่ระบุ"} | Mastery: ${l.mastery_score}/5 | Gap: ${l.major_gap} | Remedial: ${remedialCount}/${l.total_students || 0} | Strategy: ${l.next_strategy || "ไม่ระบุ"} | Issue: ${l.key_issue || "ไม่ระบุ"}`;
  }).join("\n");

  const avgMastery = (logs.reduce((s, l) => s + l.mastery_score, 0) / logs.length).toFixed(1);

  const refList = slice.map((_, i) => `[REF-${i + 1}]`).join(", ");
  const extractedRemedialIds = [...new Set(
    slice
      .flatMap((l) => (l.remedial_ids || "").split(","))
      .map((s) => s.trim())
      .filter((s) => s && s !== "[None]" && s !== "[N/A]")
  )];
  const hasTotalStudents = slice.some((l) => (l.total_students ?? 0) > 0);
  const hasRemedialIds = extractedRemedialIds.length > 0;

  const guardNote = `\n\n[GUARD RULES — enforce ทุกคำตอบ]\n- REF ที่ถูกต้องในการสนทนานี้: ${refList} (ใช้ได้เฉพาะรายการนี้เท่านั้น)\n- ห้ามสร้าง REF รูปแบบอื่น เช่น [REF-19ก.พ.] หรือ [REF-ชื่อเรื่อง]\n- Remedial IDs ที่พบใน context: ${hasRemedialIds ? extractedRemedialIds.join(", ") : "ไม่มี"}\n- total_students ใน context: ${hasTotalStudents ? "มี" : "ไม่มี — ห้ามสร้างตัวเลข X/Y หรือ %"}\n- ห้ามสร้าง student ID ขึ้นเองเด็ดขาด ถ้าไม่มี ID ใน context ให้ตอบว่า \"ไม่พบรหัสนักเรียนในข้อมูล\"`;
  
  return `## ข้อมูลการสอนที่กรองแล้ว (${logs.length} คาบ)
Mastery เฉลี่ย: ${avgMastery}/5

### รายละเอียด (ใช้ [REF-X] อ้างอิงเสมอ):
${sessionDetails}${guardNote}`;
}

export default function Consultant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  // Exam generation state
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examContent, setExamContent] = useState("");
  const [examLoading, setExamLoading] = useState(false);
  const [examCopied, setExamCopied] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [examStep, setExamStep] = useState<"select" | "generating">("select");
  const examBottomRef = useRef<HTMLDivElement>(null);
  
  // Context filter state - prevents Data Leakage
  // Start with empty filter; auto-set to first available data once loaded
  const [contextFilter, setContextFilter] = useState<DiagnosticFilter>({
    subject: "",
    gradeLevel: "",
    classroom: "",
  });
  const [filterInitialized, setFilterInitialized] = useState(false);

  const { allLogs, filterOptions, isLoading: dashboardLoading } = useDashboardData(loadPersistedFilters());
  const { diagnosticEvents, colorCounts, activeStrikes, isLoading: diagnosticLoading } = useDiagnosticData(contextFilter);

  const dataLoading = dashboardLoading || diagnosticLoading;

  // Auto-initialize filter: prefer Dashboard's persisted filter, else last log
  useEffect(() => {
    if (!filterInitialized && !dashboardLoading && allLogs.length > 0) {
      const persisted = getPersistedFiltersFromStorage();
      const opts = {
        grades: [...new Set(allLogs.map((l) => l.grade_level))],
        classrooms: [...new Set(allLogs.map((l) => String(l.classroom ?? "")))],
        subjects: [...new Set(allLogs.map((l) => l.subject))],
      };
      const persistedValid =
        persisted &&
        opts.grades.includes(persisted.gradeLevel) &&
        opts.classrooms.includes(persisted.classroom) &&
        opts.subjects.includes(persisted.subject);
      if (persistedValid) {
        setContextFilter({
          subject: persisted!.subject,
          gradeLevel: persisted!.gradeLevel,
          classroom: persisted!.classroom,
        });
      } else {
        const last = allLogs[allLogs.length - 1];
        setContextFilter({
          subject: last.subject,
          gradeLevel: last.grade_level,
          classroom: String(last.classroom),
        });
      }
      setFilterInitialized(true);
    }
  }, [filterInitialized, dashboardLoading, allLogs]);

  // Persist filter when user changes it (sync with Dashboard)
  useEffect(() => {
    if (filterInitialized && contextFilter.subject && contextFilter.gradeLevel && contextFilter.classroom) {
      persistFilters({
        subject: contextFilter.subject,
        gradeLevel: contextFilter.gradeLevel,
        classroom: contextFilter.classroom,
      });
    }
  }, [filterInitialized, contextFilter.subject, contextFilter.gradeLevel, contextFilter.classroom]);

  // Filter logs by context to prevent Data Leakage
  const filteredLogs = allLogs.filter(log => {
    const matchSubject = !contextFilter.subject || log.subject === contextFilter.subject;
    const matchGrade = !contextFilter.gradeLevel || log.grade_level === contextFilter.gradeLevel;
    const matchClass = !contextFilter.classroom || String(log.classroom) === contextFilter.classroom;
    return matchSubject && matchGrade && matchClass;
  });
  
  // Build context with citation format
  const baseContext = buildContextWithCitation(filteredLogs);
  const qwrMetrics = buildQwrMetricsBlock(filteredLogs);

  // Diagnostic summary (colorCounts + activeStrikes) — ตรงกับ ChatSidebar
  let diagnosticSummary = "";
  if (colorCounts) {
    diagnosticSummary += `\nDiagnostic: RED=${colorCounts.red} ORANGE=${colorCounts.orange} YELLOW=${colorCounts.yellow} BLUE=${colorCounts.blue} GREEN=${colorCounts.green}`;
  }
  if (activeStrikes && activeStrikes.length > 0) {
    diagnosticSummary += `\nActive Strikes (≥2): ${activeStrikes.length} รายการ`;
  }

  // Inject strict narrator context from latest FILTERED decision_object
  let strictContext = "";
  const latestDecision = (diagnosticEvents as unknown as DecisionEventLike[] | undefined)?.find(
    (de) => !!de.decision_object && !de.student_id
  );
  if (latestDecision?.decision_object) {
    const d = latestDecision.decision_object as DecisionObject;
    const strict = buildStrictAnswerTH({
      date: "latest",
      classId: d.class_id,
      subject: d.subject,
      topic: d.normalized_topic,
      decision: d,
    });
    strictContext = `\n\n[ATLAS STRICT MODE]\n${strict.answer_th}`;
  }
  
  // SCOPE assertion - prevents Data Leakage (ห้าม AI พูดถึงวิชาอื่น)
  const allowedSubjects = [...new Set(filteredLogs.map((l) => l.subject))];
  const scopeAssertion =
    allowedSubjects.length > 0
      ? `\n\n## [CRITICAL - ANSWER SCOPE]
ตอบเฉพาะวิชา: ${allowedSubjects.join(", ")} เท่านั้น
ห้ามกล่าวถึง ศิลปะ ภาษาไทย หรือวิชาอื่นที่ไม่มีในรายการข้างต้นเด็ดขาด`
      : `\n\n## [CRITICAL - ANSWER SCOPE]
ไม่มีข้อมูลที่ตรงกับ filter หากจะตอบ ให้ตอบว่า "ไม่พบข้อมูลในระบบ"`;

  // Add filter info to context
  const filterInfo = `\n\n## [ACTIVE FILTER]
วิชา: ${contextFilter.subject || "ทั้งหมด"}
ระดับชั้น: ${contextFilter.gradeLevel || "ทั้งหมด"}
ห้อง: ${contextFilter.classroom || "ทั้งหมด"}
⚠️ AI ต้องตอบเฉพาะข้อมูลที่อยู่ใน [REF-X] เท่านั้น ห้ามนำข้อมูลวิชาอื่นมาปน`;

  // Phase 6: Context validation — append warnings if any
  const validation = validateContextBeforeAI(filteredLogs);
  const validationNote =
    validation.warnings.length > 0
      ? `\n\n## [CONTEXT WARNINGS]\n${validation.warnings.join("\n")} — กรุณาระมัดระวังเมื่ออ้างอิงตัวเลข`
      : "";

  const context = baseContext + qwrMetrics + diagnosticSummary + strictContext + scopeAssertion + filterInfo + validationNote;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading || sendingRef.current) return;

    const pushAssistant = (content: string) => {
      setMessages((prev) => [...prev, { id: genMsgId(), role: "assistant", content }]);
    };

    if (dataLoading) {
      toast.info("กำลังโหลดข้อมูล... กรุณารอสักครู่");
      pushAssistant("กำลังโหลดข้อมูลอยู่ครับ รอสักครู่แล้วลองส่งคำถามใหม่อีกครั้ง");
      return;
    }

    // Prevent accidental leakage: do not allow sending while filter is not ready.
    if (
      !filterInitialized ||
      !contextFilter.subject ||
      !contextFilter.gradeLevel ||
      !contextFilter.classroom
    ) {
      toast.info("กรุณาเลือก วิชา/ชั้น/ห้อง ให้ครบก่อนถามพีท");
      pushAssistant("ก่อนถามพีท กรุณาเลือก **วิชา/ชั้น/ห้อง** ให้ครบก่อนนะครับ เพื่อป้องกันข้อมูลปนกัน");
      return;
    }

    if (filteredLogs.length === 0) {
      toast.info("ไม่พบข้อมูลการสอนที่ตรงกับตัวกรอง กรุณาปรับตัวกรองก่อน");
      pushAssistant("ไม่พบข้อมูลการสอนที่ตรงกับตัวกรองนี้ครับ ลองปรับ **วิชา/ชั้น/ห้อง** แล้วถามใหม่อีกครั้ง");
      return;
    }
    sendingRef.current = true;

    const userMsg: Msg = { id: genMsgId(), role: "user", content: text };
    setInput("");
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { id: genMsgId(), role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const chatUrl = getAiChatUrl();
      if (!chatUrl) {
        toast.error("VITE_SUPABASE_URL ไม่ได้ตั้งค่าใน .env");
        sendingRef.current = false;
        setIsLoading(false);
        return;
      }
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30_000);
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: await getEdgeFunctionHeaders(),
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context,
        }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const data = await resp.json().catch(() => ({}));
      const content =
        (data as { content?: string }).content ??
        (data as { error?: string }).error ??
        `Error ${resp.status}`;

      if (!resp.ok) {
        toast.error(content);
      }

      upsertAssistant(content || "ไม่สามารถรับคำตอบได้ กรุณาลองใหม่อีกครั้งครับ");
    } catch (e) {
      console.error("Chat error:", e);
      const msg =
        e instanceof DOMException && e.name === "AbortError"
          ? "พีทใช้เวลานานเกินไป กรุณาลองส่งใหม่อีกครั้งครับ"
          : e instanceof Error
            ? e.message
            : "เกิดข้อผิดพลาดในการเชื่อมต่อ AI";
      toast.error(msg);
      upsertAssistant(msg);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
    }
  };

  const openExamDialog = () => {
    if (filteredLogs.length === 0) {
      toast.error("ไม่มีข้อมูลการสอนในตัวกรองนี้ กรุณาเลือกวิชา/ชั้น/ห้องก่อน");
      return;
    }
    setExamContent("");
    setExamCopied(false);
    setExamStep("select");
    setSelectedUnit("");
    setExamDialogOpen(true);
  };

  const generateExam = async () => {
    if (filteredLogs.length === 0) {
      toast.error("ไม่มีข้อมูลการสอนในตัวกรองนี้ กรุณาเลือกวิชา/ชั้น/ห้องก่อน");
      return;
    }
    if (!selectedUnit) {
      toast.error("กรุณาเลือกหน่วยการเรียนรู้ก่อน");
      return;
    }

    setExamContent("");
    setExamCopied(false);
    setExamStep("generating");
    setExamLoading(true);

    const url = getAiExamGenUrl();
    if (!url) {
      toast.error("ไม่พบ URL ของ Edge Function");
      setExamLoading(false);
      return;
    }

    const subject = contextFilter.subject || filteredLogs[0]?.subject || "";
    const gradeLevel = contextFilter.gradeLevel || filteredLogs[0]?.grade_level || "";
    const classroom = contextFilter.classroom || filteredLogs[0]?.classroom || "";

    // Filter logs to selected unit only
    const unitLogs = filteredLogs.filter(l => l.learning_unit === selectedUnit);
    const logsForContext = unitLogs.length > 0 ? unitLogs : filteredLogs;

    // Build context using real teaching_logs fields (not JSONB topics_covered)
    const contextLines = logsForContext.slice(0, 30).map((log, i) => {
      return `[REF-${i + 1}] ${log.teaching_date} | หน่วย: ${log.learning_unit || "ไม่ระบุ"} | หัวข้อ: ${log.topic || "ไม่ระบุ"} | Mastery: ${log.mastery_score}/5 | Gap: ${log.major_gap || "ไม่ระบุ"} | Issue: ${log.key_issue || "-"}`;
    });
    const context = contextLines.join("\n");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: await getAiExamGenHeaders(),
        body: JSON.stringify({ gradeLevel, classroom, subject, unit: selectedUnit, context }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        toast.error(err.error || "เกิดข้อผิดพลาดในการสร้างข้อสอบ");
        setExamLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              setExamContent((prev) => prev + delta);
              setTimeout(() => examBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }
          } catch {
            // ignore malformed SSE chunk
          }
        }
      }
    } catch (e) {
      console.error("Exam gen error:", e);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
    } finally {
      setExamLoading(false);
    }
  };

  const copyExam = async () => {
    if (!examContent) return;
    await navigator.clipboard.writeText(examContent);
    setExamCopied(true);
    toast.success("คัดลอกข้อสอบแล้ว");
    setTimeout(() => setExamCopied(false), 2000);
  };

  if (!dashboardLoading && allLogs.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-lg font-medium text-foreground mb-1">ยังไม่มีข้อมูลการสอน</p>
              <p className="text-sm text-muted-foreground mb-6">เริ่มต้นด้วยการบันทึกหลังสอนก่อนนะคะ</p>
              <Button onClick={() => navigate("/log")}>บันทึกหลังสอน</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">🤖 AI ที่ปรึกษา — พีท ร่างทอง</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={openExamDialog}
              disabled={examLoading || dataLoading || filteredLogs.length === 0}
              className="gap-1.5 text-xs"
            >
              {examLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileQuestion className="h-3.5 w-3.5" />
              )}
              สร้างข้อสอบ
            </Button>
          </div>

          {/* Context Filter UI - Prevents Data Leakage */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <FilterSelect
              label="วิชา"
              value={contextFilter.subject ?? ""}
              options={filterOptions.subjects}
              onChange={(v) => setContextFilter(prev => ({ ...prev, subject: v }))}
              allLabel="ทุกวิชา"
              compact
              className="min-w-0"
              triggerClassName="w-[120px]"
            />
            <FilterSelect
              label="ชั้น"
              value={contextFilter.gradeLevel ?? ""}
              options={filterOptions.gradeLevels}
              onChange={(v) => setContextFilter(prev => ({ ...prev, gradeLevel: v }))}
              allLabel="ทุกชั้น"
              compact
              className="min-w-0"
              triggerClassName="w-[80px]"
            />
            <FilterSelect
              label="ห้อง"
              value={contextFilter.classroom ?? ""}
              options={filterOptions.classrooms}
              onChange={(v) => setContextFilter(prev => ({ ...prev, classroom: v }))}
              allLabel="ทุกห้อง"
              compact
              className="min-w-0"
              triggerClassName="w-[70px]"
            />
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md whitespace-nowrap shrink-0">
              {filteredLogs.length} คาบ
            </span>
          </div>
        </div>

        <ScrollArea className="flex-1 glass-card p-4 mb-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm text-center py-20">
              สวัสดีครับ! ผมพีท ร่างทอง 🙏<br />
              ที่ปรึกษาวิชาการ AI ของระบบ ATLAS<br /><br />
              ถามเกี่ยวกับการสอน Gap Analysis หรือ Activity Ideas ได้เลยครับ
            </div>
          )}
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "glass-card"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="glass-card rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {dataLoading && (
          <p className="text-xs text-muted-foreground mb-2">⏳ กำลังโหลดข้อมูล...</p>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={dataLoading ? "กำลังโหลดข้อมูล... รอสักครู่" : "ถามพีทได้เลยครับ เช่น 'แนะนำกิจกรรมแก้ K-Gap หน่อย'"}
            disabled={isLoading || dataLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || dataLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
      {/* Exam Generation Dialog */}
      <Dialog open={examDialogOpen} onOpenChange={(open) => {
        if (!open && examLoading) return; // ห้ามปิดขณะ generating
        setExamDialogOpen(open);
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                {examStep === "select" ? "เลือกหน่วยการเรียนรู้" : (
                  <>
                    ข้อสอบ AI — {selectedUnit}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({contextFilter.subject} ป.{contextFilter.gradeLevel?.replace("ป.", "")}/{contextFilter.classroom})
                    </span>
                  </>
                )}
              </DialogTitle>
              {examStep === "generating" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyExam}
                  disabled={!examContent || examLoading}
                  className="gap-1.5 mr-6"
                >
                  {examCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {examCopied ? "คัดลอกแล้ว" : "คัดลอก"}
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* Step 1: เลือกหน่วย */}
          {examStep === "select" && (() => {
            const unitOptions = [...new Set(
              filteredLogs.map(l => l.learning_unit).filter(Boolean)
            )].sort();
            return (
              <div className="flex flex-col gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                  เลือกหน่วยการเรียนรู้ที่ต้องการออกข้อสอบ
                  <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                    {filteredLogs.length} คาบ
                  </span>
                </p>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- เลือกหน่วยการเรียนรู้ --" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map(u => {
                      const count = filteredLogs.filter(l => l.learning_unit === u).length;
                      return (
                        <SelectItem key={u} value={u!}>
                          {u} <span className="text-muted-foreground text-xs">({count} คาบ)</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedUnit && (
                  <div className="text-xs text-muted-foreground bg-muted rounded p-2">
                    หัวข้อที่สอนในหน่วยนี้:{" "}
                    {filteredLogs
                      .filter(l => l.learning_unit === selectedUnit)
                      .map(l => l.topic)
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                <Button
                  onClick={generateExam}
                  disabled={!selectedUnit}
                  className="w-full gap-2"
                >
                  <FileQuestion className="h-4 w-4" />
                  สร้างข้อสอบจากหน่วยนี้
                </Button>
              </div>
            );
          })()}

          {/* Step 2: แสดงข้อสอบ */}
          {examStep === "generating" && (
            <ScrollArea className="flex-1 mt-2 pr-2">
              {examLoading && !examContent && (
                <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>
                    พีทกำลังสร้างข้อสอบ {selectedUnit} จาก{" "}
                    {filteredLogs.filter(l => l.learning_unit === selectedUnit).length} คาบ...
                  </span>
                </div>
              )}
              {examContent && (
                <div className="prose prose-sm prose-invert max-w-none text-sm">
                  <ReactMarkdown>{examContent}</ReactMarkdown>
                </div>
              )}
              <div ref={examBottomRef} />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
