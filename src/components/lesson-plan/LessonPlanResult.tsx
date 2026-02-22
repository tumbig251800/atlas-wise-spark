import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";

interface Props {
  content: string;
  loading: boolean;
}

export function LessonPlanResult({ content, loading }: Props) {
  if (!content && !loading) return null;

  return (
    <div className="glass-card p-6 space-y-3">
      <h3 className="text-sm font-semibold">แผนการสอน</h3>
      {loading && !content && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังสร้างแผนการสอน...
        </div>
      )}
      {content && (
        <div className="prose prose-invert prose-sm max-w-none text-foreground">
          <ReactMarkdown>{content}</ReactMarkdown>
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
