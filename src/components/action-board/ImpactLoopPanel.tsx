import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, Flag, RotateCcw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useImpactLoop } from "@/hooks/useImpactLoop";
import { CaseStudentPicker } from "@/components/action-board/CaseStudentPicker";
import type { ActionItem } from "@/hooks/useActionItems";
import {
  IMPACT_LOOP_STEPS,
  IMPACT_LOOP_LABEL,
  IMPACT_LOOP_HINT,
  impactLoopStepIndex,
  isImpactLoopTerminal,
  type ImpactLoopStatus,
} from "@/domain/impactLoop";

/**
 * PLC Impact Loop panel for a single Action Item — shows the loop progress and
 * the next action the teacher can take. Confirm → PLC → intervene → monitor →
 * close, with a DB-enforced closure guard behind it.
 */
export function ImpactLoopPanel({ item }: { item: ActionItem }) {
  const { user } = useAuth();
  const { startImpactLoop, confirmCase } = useImpactLoop();

  const status = (item.impact_loop_status ?? null) as ImpactLoopStatus | null;
  const currentIdx = impactLoopStepIndex(status);
  const terminal = isImpactLoopTerminal(status);
  const busy = startImpactLoop.isPending || confirmCase.isPending;

  return (
    <Card className="p-4 space-y-4 border-primary/20">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" /> PLC Impact Loop
        </h4>
        {status && (
          <Badge variant={terminal ? "default" : "secondary"}>
            {IMPACT_LOOP_LABEL[status]}
          </Badge>
        )}
      </div>

      {/* Stepper */}
      <ol className="flex flex-wrap gap-x-4 gap-y-2">
        {IMPACT_LOOP_STEPS.map((step, idx) => {
          const done = currentIdx > idx || (terminal && idx <= currentIdx);
          const active = currentIdx === idx && !terminal;
          return (
            <li key={step} className="flex items-center gap-1.5 text-xs">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : active ? (
                <Loader2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40" />
              )}
              <span className={active ? "font-semibold text-primary" : done ? "text-foreground" : "text-muted-foreground"}>
                {IMPACT_LOOP_LABEL[step]}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Hint + next action */}
      <p className="text-xs text-muted-foreground">
        {status ? IMPACT_LOOP_HINT[status] : "ยังไม่ได้เริ่ม Impact Loop สำหรับเคสนี้"}
      </p>

      <div className="flex flex-wrap gap-2">
        {status === null && (
          <Button size="sm" disabled={busy} onClick={() => startImpactLoop.mutate(item.id)}>
            {startImpactLoop.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            เริ่ม Impact Loop
          </Button>
        )}

        {status === "awaiting_confirmation" && (
          <Button
            size="sm"
            disabled={busy || !user}
            onClick={() => user && confirmCase.mutate({ actionItemId: item.id, userId: user.id })}
          >
            {confirmCase.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            ยืนยันเป็นเคสจริง
          </Button>
        )}

        {status && status !== "awaiting_confirmation" && !terminal && (
          <span className="text-xs text-muted-foreground italic self-center">
            ขั้นต่อไป: {currentIdx + 1 < IMPACT_LOOP_STEPS.length
              ? IMPACT_LOOP_LABEL[IMPACT_LOOP_STEPS[currentIdx + 1]]
              : "ปิดเคส"} (กำลังพัฒนาหน้าจอ)
          </span>
        )}

        {status === "continued" && (
          <span className="text-xs text-blue-600 flex items-center gap-1 self-center">
            <RotateCcw className="h-3.5 w-3.5" /> เปิดรอบใหม่เพื่อพัฒนาต่อ
          </span>
        )}
        {status === "closed" && (
          <span className="text-xs text-green-700 flex items-center gap-1 self-center">
            <CheckCircle2 className="h-3.5 w-3.5" /> ปิดเคสแล้ว — พิสูจน์ผลก่อน/หลังเรียบร้อย
          </span>
        )}
      </div>

      {/* U2: pick students once the case is confirmed */}
      {currentIdx >= 2 && (
        <div className="pt-3 border-t">
          <CaseStudentPicker item={item} />
        </div>
      )}
    </Card>
  );
}
