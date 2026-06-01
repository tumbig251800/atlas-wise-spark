import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, TrendingUp } from "lucide-react";
import type { PlcPlan } from "@/types/plc";

interface PlcPlannerModalProps {
  open: boolean;
  onClose: () => void;
  onPlanSelected: (plan: PlcPlan) => void;
  plans: PlcPlan[];
  isLoading: boolean;
}

function getPlanLabel(index: number): string {
  const labels = ["แผน A", "แผน B", "แผน C"];
  return labels[index] ?? `แผน ${index + 1}`;
}

function getPlanColor(index: number): string {
  const colors = [
    "border-violet-300 bg-violet-50",
    "border-blue-300 bg-blue-50",
    "border-emerald-300 bg-emerald-50",
  ];
  return colors[index] ?? "border-gray-300 bg-gray-50";
}

function getPlanTextColor(index: number): string {
  const colors = [
    "text-violet-900",
    "text-blue-900",
    "text-emerald-900",
  ];
  return colors[index] ?? "text-gray-900";
}

export function PlcPlannerModal({
  open,
  onClose,
  onPlanSelected,
  plans,
  isLoading,
}: PlcPlannerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-600" />
            AI แนะนำแผน PLC
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-violet-600" />
            <p className="text-muted-foreground">AI กำลังวิเคราะห์ open items...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            ไม่มี open items ในระบบ หรือ AI ไม่สามารถสร้างแผน PLC ได้
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-4 ${getPlanColor(index)}`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className={`text-lg font-bold ${getPlanTextColor(index)}`}>
                        {getPlanLabel(index)} — {plan.plan_name}
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        ครอบคลุม: {plan.covered_item_ids.length} items ({plan.coverage_percent.toFixed(0)}%)
                      </Badge>
                    </div>
                  </div>

                  {/* Topic */}
                  <div className={getPlanTextColor(index)}>
                    <div className="text-sm font-semibold">หัวข้อ:</div>
                    <div className="text-sm">{plan.topic}</div>
                  </div>

                  {/* Type and subject/grade_band */}
                  <div className={`text-xs ${getPlanTextColor(index)} opacity-80`}>
                    {plan.plc_type === "subject" && plan.subject && (
                      <span>📚 วิชา: {plan.subject}</span>
                    )}
                    {plan.plc_type === "grade_band" && plan.grade_band && (
                      <span>🎓 ช่วงชั้น: {plan.grade_band}</span>
                    )}
                    {plan.plc_type === "cross" && (
                      <span>🔗 แบบบูรณาการ</span>
                    )}
                  </div>

                  {/* Rationale */}
                  <div className={`text-sm ${getPlanTextColor(index)}`}>
                    <div className="font-semibold">เหตุผล:</div>
                    <div className="opacity-90">{plan.rationale}</div>
                  </div>

                  {/* Members */}
                  {plan.members.length > 0 && (
                    <div className={`text-sm ${getPlanTextColor(index)}`}>
                      <div className="font-semibold flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        ครูที่ร่วม ({plan.members.length} คน):
                      </div>
                      <ul className="list-disc list-inside opacity-90 ml-4">
                        {plan.members.map((member, idx) => (
                          <li key={idx}>{member.teacher_name}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Problem statement preview */}
                  {plan.problem_statement && (
                    <div className={`text-xs ${getPlanTextColor(index)} opacity-75`}>
                      <div className="font-semibold">ประเด็นปัญหา:</div>
                      <div className="line-clamp-2">{plan.problem_statement}</div>
                    </div>
                  )}

                  {/* Select button */}
                  <div className="pt-2">
                    <Button
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                      onClick={() => onPlanSelected(plan)}
                    >
                      เลือกแผนนี้
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
