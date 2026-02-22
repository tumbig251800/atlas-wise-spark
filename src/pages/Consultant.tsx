import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";
import { useDashboardData, loadPersistedFilters } from "@/hooks/useDashboardData";
import { useDiagnosticData, type DiagnosticFilter } from "@/hooks/useDiagnosticData";
import { buildStrictAnswerTH, type DecisionObject } from "@/lib/atlasStrictNarrator";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

function buildContextWithCitation(
  logs: { teaching_date: string; subject: string; grade_level: string; classroom: string | number; topic?: string; mastery_score: number; major_gap: string; key_issue?: string; next_strategy?: string; remedial_ids?: string; total_students?: number }[]
): string {
  if (logs.length === 0) return "ไม่พบข้อมูลการสอนที่ตรงกับเงื่อนไข";
  
  const sessionDetails = logs.slice(-10).map((l, index) => {
    const refId = `[REF-${index + 1}]`;
    const remedialCount = (l.remedial_ids || "").split(",").filter(x => x.trim() && x !== "[None]" && x !== "[N/A]").length;
    return `${refId} วันที่: ${l.teaching_date} | วิชา: ${l.subject} | ห้อง: ${l.grade_level}/${l.classroom} | หัวข้อ: ${l.topic || "ไม่ระบุ"} | Mastery: ${l.mastery_score}/5 | Gap: ${l.major_gap} | Remedial: ${remedialCount}/${l.total_students || 0} | Issue: ${l.key_issue || "ไม่ระบุ"}`;
  }).join("\n");

  const avgMastery = (logs.reduce((s, l) => s + l.mastery_score, 0) / logs.length).toFixed(1);
  
  return `## ข้อมูลการสอนที่กรองแล้ว (${logs.length} คาบ)
Mastery เฉลี่ย: ${avgMastery}/5

### รายละเอียด (ใช้ [REF-X] อ้างอิงเสมอ):
${sessionDetails}`;
}

export default function Consultant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Context filter state - prevents Data Leakage
  const [contextFilter, setContextFilter] = useState<DiagnosticFilter>({
    subject: "คณิตศาสตร์",
    gradeLevel: "ป.4",
    classroom: "1",
  });

  const { allLogs, filterOptions } = useDashboardData(loadPersistedFilters());
  const { diagnosticEvents } = useDiagnosticData(contextFilter);
  
  // Filter logs by context to prevent Data Leakage
  const filteredLogs = allLogs.filter(log => {
    const matchSubject = !contextFilter.subject || log.subject === contextFilter.subject;
    const matchGrade = !contextFilter.gradeLevel || log.grade_level === contextFilter.gradeLevel;
    const matchClass = !contextFilter.classroom || String(log.classroom) === contextFilter.classroom;
    return matchSubject && matchGrade && matchClass;
  });
  
  // Build context with citation format
  const baseContext = buildContextWithCitation(filteredLogs);

  // Inject strict narrator context from latest FILTERED decision_object
  let strictContext = "";
  const latestDecision = (diagnosticEvents ?? []).find(
    (de: any) => de.decision_object && !de.student_id
  );
  if (latestDecision && (latestDecision as any).decision_object) {
    const d = (latestDecision as any).decision_object as DecisionObject;
    const strict = buildStrictAnswerTH({
      date: "latest",
      classId: d.class_id,
      subject: d.subject,
      topic: d.normalized_topic,
      decision: d,
    });
    strictContext = `\n\n[ATLAS STRICT MODE]\n${strict.answer_th}`;
  }
  
  // Add filter info to context
  const filterInfo = `\n\n## [ACTIVE FILTER]
วิชา: ${contextFilter.subject || "ทั้งหมด"}
ระดับชั้น: ${contextFilter.gradeLevel || "ทั้งหมด"}
ห้อง: ${contextFilter.classroom || "ทั้งหมด"}
⚠️ AI ต้องตอบเฉพาะข้อมูลที่อยู่ใน [REF-X] เท่านั้น ห้ามนำข้อมูลวิชาอื่นมาปน`;
  
  const context = baseContext + strictContext + filterInfo;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
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
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || `Error ${resp.status}`);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {}
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-7rem)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">🤖 AI ที่ปรึกษา — พีท ร่างทอง</h1>
          
          {/* Context Filter UI - Prevents Data Leakage */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={contextFilter.subject || ""}
              onValueChange={(v) => setContextFilter(prev => ({ ...prev, subject: v || undefined }))}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="วิชา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ทุกวิชา</SelectItem>
                {filterOptions.subjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={contextFilter.gradeLevel || ""}
              onValueChange={(v) => setContextFilter(prev => ({ ...prev, gradeLevel: v || undefined }))}
            >
              <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue placeholder="ชั้น" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ทุกชั้น</SelectItem>
                {filterOptions.gradeLevels.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={contextFilter.classroom || ""}
              onValueChange={(v) => setContextFilter(prev => ({ ...prev, classroom: v || undefined }))}
            >
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue placeholder="ห้อง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">ทุกห้อง</SelectItem>
                {filterOptions.classrooms.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {messages.map((msg, i) => (
              <div
                key={i}
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

        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ถามพีทได้เลยครับ เช่น 'แนะนำกิจกรรมแก้ K-Gap หน่อย'"
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
