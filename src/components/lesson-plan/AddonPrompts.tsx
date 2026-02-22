import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Headphones, Presentation, ImageIcon, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Props {
  lessonContent: string;
}

const addons = [
  { key: "notebooklm", label: "NotebookLM Audio", icon: Headphones },
  { key: "canva", label: "Canva Slides", icon: Presentation },
  { key: "midjourney", label: "Midjourney Images", icon: ImageIcon },
] as const;

export function AddonPrompts({ lessonContent }: Props) {
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async (addonType: string) => {
    setLoading(addonType);
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-lesson-plan`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ addonType, topic: lessonContent }),
      });

      if (!resp.ok || !resp.body) throw new Error("Failed");

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
              setResults((prev) => ({ ...prev, [addonType]: result }));
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการสร้างเนื้อหาเสริม");
    } finally {
      setLoading(null);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(results[key] || "");
    setCopied(key);
    toast.success("คัดลอกแล้ว");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-sm font-semibold">Add-on Prompts</h3>
      <div className="flex flex-wrap gap-2">
        {addons.map((a) => (
          <Button
            key={a.key}
            variant="outline"
            size="sm"
            disabled={loading !== null || !lessonContent}
            onClick={() => generate(a.key)}
          >
            {loading === a.key ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <a.icon className="h-4 w-4 mr-1" />}
            {a.label}
          </Button>
        ))}
      </div>

      {addons.map((a) =>
        results[a.key] ? (
          <div key={a.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground">{a.label}</h4>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(a.key)}>
                {copied === a.key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-foreground bg-secondary/30 rounded-lg p-4">
              <ReactMarkdown>{results[a.key]}</ReactMarkdown>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
