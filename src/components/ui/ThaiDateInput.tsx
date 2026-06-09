/**
 * ThaiDateInput — date picker 3 dropdowns (วัน/เดือน/ปี)
 * value / onChange ใช้ format "YYYY-MM-DD" (เหมือน input[type=date])
 */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

interface Props {
  value: string;           // "YYYY-MM-DD"
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ThaiDateInput({ value, onChange, disabled, className }: Props) {
  const parts = value ? value.split("-") : ["", "", ""];
  const year  = parts[0] ? parseInt(parts[0]) : null;
  const month = parts[1] ? parseInt(parts[1]) : null;
  const day   = parts[2] ? parseInt(parts[2]) : null;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);
  const maxDay = year && month ? daysInMonth(year, month) : 31;
  const days   = Array.from({ length: maxDay }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  function emit(y: number | null, m: number | null, d: number | null) {
    if (!y || !m || !d) { onChange(""); return; }
    const dd = String(d).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    onChange(`${y}-${mm}-${dd}`);
  }

  function handleDay(v: string)   { emit(year, month, parseInt(v)); }
  function handleMonth(v: string) {
    const m = parseInt(v);
    const maxD = year ? daysInMonth(year, m) : 31;
    const clampedDay = day && day > maxD ? maxD : day;
    emit(year, m, clampedDay);
  }
  function handleYear(v: string)  { emit(parseInt(v), month, day); }

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      {/* วัน */}
      <Select value={day ? String(day) : ""} onValueChange={handleDay} disabled={disabled}>
        <SelectTrigger className="w-20">
          <SelectValue placeholder="วัน" />
        </SelectTrigger>
        <SelectContent>
          {days.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {String(d).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* เดือน */}
      <Select value={month ? String(month) : ""} onValueChange={handleMonth} disabled={disabled}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="เดือน" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {THAI_MONTHS[m - 1]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* ปี (พ.ศ.) */}
      <Select value={year ? String(year) : ""} onValueChange={handleYear} disabled={disabled}>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="ปี" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y + 543}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
