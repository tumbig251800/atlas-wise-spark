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
import {
  useDashboardFilterOptions,
  useContextFirstTeachingLogs,
  getPersistedFiltersFromStorage,
  persistFilters,
} from "@/hooks/useDashboardData";
import { useDiagnosticData, type DiagnosticFilter } from "@/hooks/useDiagnosticData";
import { buildStrictAnswerTH, type DecisionObject } from "@/lib/atlasStrictNarrator";
import { validateContextBeforeAI } from "@/lib/contextValidator";
import {
  getAiChatUrl,
  getAiExamGenUrl,
  invokeEdgeJson,
  streamEdgeContent,
} from "@/lib/edgeFunctionFetch";
import { buildContextWithCitation, buildQwrMetricsBlock } from "@/domain/consultantContext";

type Msg = { id: string; role: "user" | "assistant"; content: string };

type SSEChunk = { choices?: Array<{ delta?: { content?: string } }> };
type DecisionEventLike = { decision_object?: unknown; student_id?: string | null };
type AiChatFallbackMeta = {
  validationFailed?: boolean;
  reason?: string;
  requestId?: string;
};
type AiChatResponse = {
  content?: string;
  error?: string;
  source?: string;
  meta?: AiChatFallbackMeta;
};

function genMsgId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Consultant() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const prevFilterKeyRef = useRef<string | null>(null);
  const didInitFilterKeyRef = useRef(false);

  // Academic term filter
  const [selectedTerm, setSelectedTerm] = useState<string>("");

  // Exam generation state
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examContent, setExamContent] = useState("");
  const [examLoading, setExamLoading] = useState(false);
  const [examCopied, setExamCopied] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [examStep, setExamStep] = useState<"select" | "generating">("select");
  const examBottomRef = useRef<HTMLDivElement>(null);
  
  // Context filter state - context-first (no implicit fallback context).
  const [contextFilter, setContextFilter] = useState<DiagnosticFilter>({
    subject: "",
    gradeLevel: "",
    classroom: "",
  });
  const [filterInitialized, setFilterInitialized] = useState(false);

  const { filterOptions, isLoading: optionsLoading } = useDashboardFilterOptions();
  const {
    logs: allLogs,
    hasCompleteContext,
    isLoading: logsLoading,
  } = useContextFirstTeachingLogs(contextFilter);
  const { diagnosticEvents, colorCounts, activeStrikes, isLoading: diagnosticLoading } = useDiagnosticData(
    contextFilter,
    { contextFirst: true }
  );

  const dataLoading = optionsLoading || (hasCompleteContext && (logsLoading || diagnosticLoading));

  // Derive available terms from loaded logs, auto-select latest when logs change
  const availableTerms = [...new Set(allLogs.map(l => l.academic_term).filter(Boolean) as string[])].sort().reverse();
  const filteredLogs = selectedTerm ? allLogs.filter(l => l.academic_term === selectedTerm) : allLogs;

  // Auto-initialize from persisted Dashboard filter only.
  useEffect(() => {
    if (!filterInitialized && !optionsLoading) {
      const persisted = getPersistedFiltersFromStorage();
      const persistedValid =
        persisted &&
        filterOptions.gradeLevels.includes(persisted.gradeLevel) &&
        filterOptions.classrooms.includes(persisted.classroom) &&
        filterOptions.subjects.includes(persisted.subject);
      if (persistedValid) {
        setContextFilter({
          subject: persisted.subject,
          gradeLevel: persisted.gradeLevel,
          classroom: persisted.classroom,
        });
      }
      setFilterInitialized(true);
    }
  }, [filterInitialized, optionsLoading, filterOptions.gradeLevels, filterOptions.classrooms, filterOptions.subjects]);

  // Auto-select latest term when logs load or filter changes
  useEffect(() => {
    if (availableTerms.length > 0 && !selectedTerm) {
      setSelectedTerm(availableTerms[0]);
    }
  }, [availableTerms.join(",")]);

  // Reset term selection when subject/grade/classroom filter changes
  useEffect(() => {
    setSelectedTerm("");
  }, [contextFilter.subject, contextFilter.gradeLevel, contextFilter.classroom]);

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

  const filterKey = `${contextFilter.subject || ""}|${contextFilter.gradeLevel || ""}|${contextFilter.classroom || ""}`;

  // Reset chat state when filter changes to prevent context drift.
  // We skip the initial auto-init (when didInitFilterKeyRef is still false).
  useEffect(() => {
    if (!filterInitialized) return;
    if (!didInitFilterKeyRef.current) {
      prevFilterKeyRef.current = filterKey;
      didInitFilterKeyRef.current = true;
      return;
    }
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      sendingRef.current = false;
      setIsLoading(false);
      setInput("");
      setMessages([]);
    }
  }, [filterInitialized, filterKey]);
  
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
  const assertedSubject = contextFilter.subject || allowedSubjects[0] || "";
  const scopeAssertion =
    assertedSubject
      ? `\n\n## [CRITICAL - ANSWER SCOPE]
ตอบเฉพาะวิชา: ${assertedSubject} เท่านั้น
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
      const result = await invokeEdgeJson<AiChatResponse>(
        chatUrl,
        {
          messages: [...messages, userMsg],
          context,
          audience: "teacher",
        },
        { signal: controller.signal }
      );
      window.clearTimeout(timeoutId);
      const content =
        result.data?.content ??
        result.data?.error ??
        result.errorMessage ??
        `Error ${result.status}`;

      // TEMP DEBUG: Log validation failures for ai-chat fallback
      if (result.data?.source === "fallback" && result.data.meta?.validationFailed) {
        const debugInfo = {
          reason: result.data.meta?.reason,
          requestId: result.data.meta?.requestId,
          question: text,
          timestamp: new Date().toISOString(),
        };
        console.log("[DEBUG] ai-chat validation failed:", debugInfo);
        // Show brief reason in toast for debugging
        toast.error(`Validation: ${debugInfo.reason}`);
      }

      if (!result.ok) {
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
      await streamEdgeContent(
        url,
        { gradeLevel, classroom, subject, unit: selectedUnit, context },
        (chunk) => {
          setExamContent((prev) => prev + chunk);
          setTimeout(() => examBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      );
    } catch (e) {
      console.error("Exam gen error:", e);
      const msg = e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ AI";
      toast.error(msg);
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

  if (!optionsLoading && filterOptions.subjects.length === 0) {
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
            {availableTerms.length > 0 && (
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue placeholder="ภาคเรียน" />
                </SelectTrigger>
                <SelectContent>
                  {availableTerms.map(t => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    เลือกหน่วยการเรียนรู้ที่ต้องการออกข้อสอบ
                    <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                      {filteredLogs.length} คาบ
                    </span>
                  </p>
                  {selectedTerm && (
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-md">
                      ภาคเรียน {selectedTerm}
                    </span>
                  )}
                </div>
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
