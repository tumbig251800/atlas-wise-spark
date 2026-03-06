import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  /** Label for "all/none" option, e.g. "ทั้งหมด" or "ทุกวิชา" */
  allLabel?: string;
  /** Placeholder when empty */
  placeholder?: string;
  /** Extra class for the wrapper (e.g. min-width) */
  className?: string;
  /** Extra class for SelectTrigger (e.g. w-36 h-9) */
  triggerClassName?: string;
  /** Compact mode: smaller trigger (h-8, text-xs) */
  compact?: boolean;
}

const ALL_VALUE = "all";

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  allLabel = "ทั้งหมด",
  placeholder,
  className,
  triggerClassName,
  compact = false,
}: FilterSelectProps) {
  const displayValue = value || ALL_VALUE;
  const handleChange = (v: string) => onChange(v === ALL_VALUE ? "" : v);

  return (
    <div className={cn("flex flex-col gap-1.5 min-w-[140px]", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={displayValue} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            "bg-secondary/50 border-border",
            compact && "h-8 text-xs",
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder ?? `เลือก${label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
          {options.filter(Boolean).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
