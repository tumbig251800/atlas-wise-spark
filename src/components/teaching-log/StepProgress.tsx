import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "ข้อมูลทั่วไป" },
  { label: "วัดผลคุณภาพ" },
  { label: "วินิจฉัยช่องว่าง" },
  { label: "แผนปฏิบัติการ" },
];

interface StepProgressProps {
  currentStep: number;
}

export function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <div className="flex items-center justify-between w-full mb-6">
      {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const done = currentStep > stepNum;
        const active = currentStep === stepNum;
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  done && "bg-[hsl(var(--atlas-success))] text-white",
                  active && "bg-primary text-primary-foreground animate-pulse-glow",
                  !done && !active && "bg-secondary text-muted-foreground"
                )}
              >
                {done ? <Check className="w-5 h-5" /> : stepNum}
              </div>
              <span className={cn("text-xs text-center whitespace-nowrap", active ? "text-foreground font-medium" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-2 mt-[-1rem]", done ? "bg-[hsl(var(--atlas-success))]" : "bg-secondary")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
