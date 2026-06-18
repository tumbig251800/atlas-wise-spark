import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";
import { sanitizeMarkdown } from "@/lib/markdownTableSanitizer";

interface Props {
  content: string;
  loading: boolean;
}

export function LessonPlanResult({ content, loading }: Props) {
  if (!content && !loading) return null;

  // Sanitize markdown to prevent infinite empty table rows during streaming
  const sanitizedContent = sanitizeMarkdown(content);

  return (
    <div className="glass-card p-6 space-y-3">
      <h3 className="text-sm font-semibold">แผนการสอน</h3>
      {loading && !content && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังสร้างแผนการสอน...
        </div>
      )}
      {content && (
        <div className="prose prose-lg prose-invert prose-lesson-plan max-w-none text-foreground">
          <ReactMarkdown>{sanitizedContent}</ReactMarkdown>
        </div>
      )}
      {loading && content && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> กำลังเขียนต่อ...
        </div>
      )}
    </div>
  );
}
