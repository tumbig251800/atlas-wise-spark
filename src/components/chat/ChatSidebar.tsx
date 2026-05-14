import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getEdgeFunctionHeaders, getAiChatUrl, invokeEdgeJson } from "@/lib/edgeFunctionFetch";

type Msg = { id: string; role: "user" | "assistant"; content: string };

function genId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type AiChatAudience = "teacher" | "executive";

interface ChatSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: string;
  /** ส่งไปยัง ai-chat: น้ำเสียงทักทาย (ครู vs ผู้บริหาร) */
  audience?: AiChatAudience;
}

export function ChatSidebar({ open, onOpenChange, context, audience = "teacher" }: ChatSidebarProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastDebug, setLastDebug] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const pendingAssistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading || sendingRef.current) return;
    sendingRef.current = true;

    const userMsg: Msg = { id: genId(), role: "user", content: text };
    const pendingId = genId();
    pendingAssistantIdRef.current = pendingId;
    setInput("");
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: pendingId, role: "assistant", content: "กำลังคิด..." },
    ]);
    setIsLoading(true);

    const setAssistant = (content: string) => {
      const targetId = pendingAssistantIdRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          targetId && m.id === targetId ? { ...m, content } : m
        )
      );
    };

    try {
      const chatUrl = getAiChatUrl();
      if (!chatUrl) {
        toast.error("VITE_SUPABASE_URL ไม่ได้ตั้งค่าใน .env");
        sendingRef.current = false;
        setIsLoading(false);
        return;
      }
      const requestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().slice(0, 8)
          : Math.random().toString(36).slice(2, 10);
      // Make sure user sees a trace even if request is blocked (CORS/preflight/etc.)
      setLastDebug(`rid=${requestId} status=starting url=${chatUrl}`);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30_000);
      const headers = await getEdgeFunctionHeaders();
      headers["x-request-id"] = requestId;
      const authHeader = String(headers.Authorization || "");
      const token = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : authHeader.trim();
      let tokenRef: string | null = null;
      let tokenIss: string | null = null;
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const json = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
          const payload = JSON.parse(json) as { ref?: string; iss?: string };
          tokenRef = payload?.ref ?? null;
          tokenIss = payload?.iss ?? null;
        }
      } catch (error) {
        console.warn("Cannot decode token payload", error);
      }
      setLastDebug(
        `rid=${requestId} status=starting url=${chatUrl} authLen=${token.length} ref=${tokenRef ?? "-"} iss=${tokenIss ? tokenIss.replace("https://", "").slice(0, 28) : "-"}`
      );
      const result = await invokeEdgeJson<{ content?: string; error?: string }>(
        chatUrl,
        {
          messages: [...messages, userMsg],
          context: context || "",
          audience,
        },
        { signal: controller.signal }
      );
      window.clearTimeout(timeoutId);
      const content = result.data?.content ?? result.errorMessage ?? `Error ${result.status}`;

      if (!result.ok) toast.error(content);

      // If gateway says Invalid JWT, force user to re-login (stale cross-project session).
      if (result.status === 401 && (result.errorMessage || "").includes("Invalid JWT")) {
        const authHeader = String(headers.Authorization || "");
        // best-effort: include token ref/iss in recovery for easier debugging
        const tokenParts = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim().split(".")
          : authHeader.trim().split(".");
        let tokenRef = "-";
        let tokenIss = "-";
        if (tokenParts.length === 3) {
          try {
            const b64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
            const json = atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="));
            const payload = JSON.parse(json) as { ref?: string; iss?: string };
            tokenRef = payload?.ref ?? "-";
            tokenIss = payload?.iss ?? "-";
          } catch (error) {
            console.warn("Cannot decode token from 401 response", error);
          }
        }
        let apikeyPrefix = "-";
        try {
          const apikey = String(headers.apikey || "");
          apikeyPrefix = apikey ? apikey.slice(0, 16) : "-";
        } catch (error) {
          console.warn("Cannot read apikey header", error);
        }

        try {
          sessionStorage.setItem(
            "atlas_auth_recover",
            JSON.stringify({
              reason: "edge_gateway_invalid_jwt",
              meta: {
                requestId,
                url: chatUrl,
                lastDebug,
                raw: String(result.errorMessage || "").slice(0, 200),
                tokenRef,
                tokenIss,
                apikeyPrefix,
              },
              ts: Date.now(),
            })
          );
        } catch (error) {
          console.warn("Cannot persist auth recovery metadata", error);
        }
        setAssistant(
          "เซสชันไม่ถูกต้อง (Invalid JWT). หยุดการเด้งไป login เพื่อให้ตรวจสอบ token ได้ก่อนครับ"
        );
      } else {
      setLastDebug(
        `rid=${requestId} status=${result.status} url=${chatUrl} raw=${result.errorMessage ? result.errorMessage.slice(0, 160) : "(ok)"}`
      );
        setAssistant(content || "ไม่สามารถรับคำตอบได้ กรุณาลองใหม่อีกครั้งครับ");
      }
    } catch (e) {
      console.error("Chat error:", e);
      const msg =
        e instanceof DOMException && e.name === "AbortError"
          ? "พีทใช้เวลานานเกินไป กรุณาลองส่งใหม่อีกครั้งครับ"
          : e instanceof Error
            ? e.message
            : "เกิดข้อผิดพลาดในการเชื่อมต่อ AI";
      toast.error(msg);
      setLastDebug(`error=${msg}`);
      setAssistant(msg);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md p-0" overlayClassName="hidden">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            🤖 พีท ร่างทอง — AI ที่ปรึกษา
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm text-center py-12">
              สวัสดีครับ! ผมพีท ร่างทอง 🙏<br />
              ถามอะไรเกี่ยวกับการสอนได้เลยครับ
            </div>
          )}
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
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
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {lastDebug && (
          <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            {lastDebug}
          </div>
        )}

        <div className="border-t border-border p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์คำถาม..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
