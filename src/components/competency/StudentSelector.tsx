/**
 * Phase D Stage 3: Searchable student selector
 */
import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { StudentOption } from "@/lib/competencyReportQueries";

interface StudentSelectorProps {
  students: StudentOption[];
  value: string | null;
  onChange: (studentId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function StudentSelector({
  students,
  value,
  onChange,
  placeholder = "ค้นหาและเลือกนักเรียน",
  disabled = false,
}: StudentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter(
      (s) =>
        (s.student_name ?? s.student_id).toLowerCase().includes(q) ||
        s.student_id.toLowerCase().includes(q)
    );
  }, [students, search]);

  const selected = students.find((s) => s.student_id === value);

  return (
    <div className="flex flex-col gap-1.5 min-w-[200px]">
      <span className="text-xs text-muted-foreground">เลือกนักเรียน</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between bg-secondary/50 border-border font-normal"
          >
            {selected ? (
              <span className="truncate">
                {selected.student_name ?? selected.student_id}
                <span className="ml-1 text-muted-foreground">
                  (ป.{selected.grade_level} {selected.classroom})
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(360px,90vw)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="พิมพ์ชื่อหรือรหัสนักเรียน..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>ไม่พบนักเรียนที่ตรงกับคำค้น</CommandEmpty>
              <CommandGroup>
                {filtered.map((s) => (
                  <CommandItem
                    key={s.student_id}
                    value={s.student_id}
                    onSelect={() => {
                      onChange(s.student_id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === s.student_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{s.student_name ?? s.student_id}</span>
                      <span className="text-xs text-muted-foreground">
                        ป.{s.grade_level} ห้อง {s.classroom}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
