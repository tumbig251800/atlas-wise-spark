import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface RemedialStatusSelectorProps {
  remedialIds: string;
  statuses: Record<string, "pass" | "stay">;
  onChange: (statuses: Record<string, "pass" | "stay">) => void;
  error?: string;
}

export function RemedialStatusSelector({ remedialIds, statuses, onChange, error }: RemedialStatusSelectorProps) {
  const ids = remedialIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) return null;

  const setStatus = (id: string, status: "pass" | "stay") => {
    onChange({ ...statuses, [id]: status });
  };

  return (
    <div className="space-y-3" data-error={error ? true : undefined}>
      <Label>สถานะซ่อมเสริมรายบุคคล <span className="text-destructive">*</span></Label>
      <div className="space-y-2">
        {ids.map((id) => (
          <div
            key={id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              statuses[id] === "pass"
                ? "border-[hsl(var(--atlas-success))]/50 bg-[hsl(var(--atlas-success))]/10"
                : statuses[id] === "stay"
                  ? "border-[hsl(var(--atlas-warning))]/50 bg-[hsl(var(--atlas-warning))]/10"
                  : "border-border bg-secondary/30"
            )}
          >
            <span className="font-mono text-sm min-w-[60px]">{id}</span>
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setStatus(id, "pass")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  statuses[id] === "pass"
                    ? "bg-[hsl(var(--atlas-success))] text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                )}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                PASS
              </button>
              <button
                type="button"
                onClick={() => setStatus(id, "stay")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  statuses[id] === "stay"
                    ? "bg-[hsl(var(--atlas-warning))] text-primary-foreground"
                    : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                STAY
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
