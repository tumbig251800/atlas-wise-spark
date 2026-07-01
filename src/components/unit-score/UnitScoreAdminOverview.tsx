/**
 * UnitScoreAdminOverview.tsx
 * มุมมองผู้บริหาร: เห็นว่าชั้น/ห้องไหน อัปโหลดคะแนนหลังหน่วยแล้วกี่วิชา
 * และวิชาไหนในชั้นเดียวกัน โหลดหน่วยไปถึงไหนแล้ว (relative เทียบห้องคู่ขนาน)
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TeachingLogRow = {
  academic_term: string | null;
  grade_level: string;
  classroom: string;
  subject: string;
};

type SetupRow = {
  academic_term: string;
  grade_level: string;
  classroom: string;
  subject: string;
  unit_name: string;
  assessed_date: string | null;
  teacher_id: string;
  created_at: string | null;
};

function classKey(grade: string, classroom: string) {
  return `${grade}|${classroom}`;
}

// unit_name เป็น free text ที่ครูกรอกเอง บางไฟล์ (เฉพาะข้อมูลเก่าที่ bulk import
// มาก่อนมี parser ปัจจุบัน) กรอกเป็น "หน่วยที่ 1" แทน "1" — ดึงเฉพาะเลขหน่วยออกมา
// เพื่อกันไม่ให้ "1" กับ "หน่วยที่ 1" ถูกนับเป็นคนละหน่วย
function normalizeUnitNumber(unitName: string): string {
  const match = unitName.match(/\d+/);
  return match ? match[0] : unitName.trim();
}

export function UnitScoreAdminOverview() {
  const [academicTerm, setAcademicTerm] = useState("2569-1");
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  // วิชาที่สอนจริงในระบบ (ตัวส่วน — ใช้หา "สอนแล้วแต่ยังไม่โหลด")
  // teaching_logs มีเป็นพันแถว เกิน default row cap ของ Supabase (1000) ต้อง page ทีละก้อน
  // ไม่งั้นบางวิชา/บางชั้นจะหายไปจากรายงานเงียบๆ โดยไม่มี error ให้เห็น
  const { data: taughtRows } = useQuery({
    queryKey: ["unit-score-overview-taught"],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const rows: TeachingLogRow[] = [];
      for (let page = 0; ; page++) {
        const from = page * PAGE_SIZE;
        const { data, error } = await supabase
          .from("teaching_logs")
          .select("academic_term, grade_level, classroom, subject")
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        rows.push(...((data ?? []) as TeachingLogRow[]));
        if (!data || data.length < PAGE_SIZE) break;
      }
      return rows;
    },
  });

  // วิชา/หน่วยที่โหลดคะแนนหลังหน่วยแล้ว (ตัวเศษ)
  const { data: setupRows } = useQuery({
    queryKey: ["unit-score-overview-setups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_assessment_setups")
        .select(
          "academic_term, grade_level, classroom, subject, unit_name, assessed_date, teacher_id, created_at"
        );
      if (error) throw error;
      return (data ?? []) as SetupRow[];
    },
  });

  // ชื่อครูผู้โหลดล่าสุด (join profiles เอง เพราะ unit_assessment_setups ไม่มี teacher_name)
  const teacherIds = useMemo(
    () => [...new Set((setupRows ?? []).map((r) => r.teacher_id))],
    [setupRows]
  );

  const { data: teacherProfiles } = useQuery({
    queryKey: ["unit-score-overview-teachers", teacherIds],
    enabled: teacherIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", teacherIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>();
    (teacherProfiles ?? []).forEach((p) => {
      if (p.full_name) map.set(p.user_id, p.full_name);
    });
    return map;
  }, [teacherProfiles]);

  const termOptions = useMemo(() => {
    const set = new Set<string>(
      (taughtRows ?? []).map((r) => r.academic_term).filter(Boolean) as string[]
    );
    set.add(academicTerm);
    return [...set].sort().reverse();
  }, [taughtRows, academicTerm]);

  const taughtInTerm = useMemo(
    () => (taughtRows ?? []).filter((r) => r.academic_term === academicTerm),
    [taughtRows, academicTerm]
  );
  const setupsInTerm = useMemo(
    () => (setupRows ?? []).filter((r) => r.academic_term === academicTerm),
    [setupRows, academicTerm]
  );

  // === ระดับ 1: ภาพรวมทุกชั้น/ห้อง ===
  const level1Rows = useMemo(() => {
    const byClass = new Map<
      string,
      {
        grade: string;
        classroom: string;
        subjectsTaught: Set<string>;
        subjectsUploaded: Set<string>;
        unitsUploaded: Set<string>;
        lastUpdated: string | null;
      }
    >();

    for (const row of taughtInTerm) {
      const key = classKey(row.grade_level, row.classroom);
      if (!byClass.has(key)) {
        byClass.set(key, {
          grade: row.grade_level,
          classroom: row.classroom,
          subjectsTaught: new Set(),
          subjectsUploaded: new Set(),
          unitsUploaded: new Set(),
          lastUpdated: null,
        });
      }
      byClass.get(key)!.subjectsTaught.add(row.subject);
    }

    for (const row of setupsInTerm) {
      const key = classKey(row.grade_level, row.classroom);
      if (!byClass.has(key)) {
        byClass.set(key, {
          grade: row.grade_level,
          classroom: row.classroom,
          subjectsTaught: new Set(),
          subjectsUploaded: new Set(),
          unitsUploaded: new Set(),
          lastUpdated: null,
        });
      }
      const entry = byClass.get(key)!;
      entry.subjectsUploaded.add(row.subject);
      entry.unitsUploaded.add(`${row.subject}|${normalizeUnitNumber(row.unit_name)}`);
      const stamp = row.assessed_date ?? row.created_at ?? null;
      if (stamp && (!entry.lastUpdated || stamp > entry.lastUpdated)) {
        entry.lastUpdated = stamp;
      }
    }

    return [...byClass.values()]
      .map((entry) => ({
        ...entry,
        missingSubjects: [...entry.subjectsTaught].filter(
          (s) => !entry.subjectsUploaded.has(s)
        ),
      }))
      .sort((a, b) =>
        a.grade === b.grade
          ? a.classroom.localeCompare(b.classroom, "th")
          : a.grade.localeCompare(b.grade, "th")
      );
  }, [taughtInTerm, setupsInTerm]);

  const gradeOptions = useMemo(
    () => [...new Set(level1Rows.map((r) => r.grade))].sort((a, b) => a.localeCompare(b, "th")),
    [level1Rows]
  );

  // === ระดับ 2: ตาราง วิชา × ห้อง ภายในชั้นที่เลือก ===
  const level2 = useMemo(() => {
    if (!selectedGrade) return null;

    const classroomsInGrade = level1Rows
      .filter((r) => r.grade === selectedGrade)
      .map((r) => r.classroom)
      .sort((a, b) => a.localeCompare(b, "th"));

    const subjectsInGrade = [
      ...new Set(
        taughtInTerm
          .filter((r) => r.grade_level === selectedGrade)
          .map((r) => r.subject)
      ),
    ].sort((a, b) => a.localeCompare(b, "th"));

    const cell = new Map<string, { units: string[]; teacher: string | null }>();
    for (const row of setupsInTerm) {
      if (row.grade_level !== selectedGrade) continue;
      const key = `${row.subject}|${row.classroom}`;
      if (!cell.has(key)) cell.set(key, { units: [], teacher: null });
      const c = cell.get(key)!;
      const unitNumber = normalizeUnitNumber(row.unit_name);
      if (!c.units.includes(unitNumber)) c.units.push(unitNumber);
      c.teacher = teacherNameById.get(row.teacher_id) ?? c.teacher;
    }
    // เรียงหมายเลขหน่วยจากน้อยไปมาก
    for (const c of cell.values()) {
      c.units.sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
    }

    return { classroomsInGrade, subjectsInGrade, cell };
  }, [selectedGrade, level1Rows, taughtInTerm, setupsInTerm, teacherNameById]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-sm font-medium mb-1">ภาคเรียน</p>
          <Select value={academicTerm} onValueChange={setAcademicTerm}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {termOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ระดับ 1: ภาพรวมทุกชั้น/ห้อง */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ภาพรวมทุกชั้น/ห้อง — ภาคเรียน {academicTerm}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชั้น/ห้อง</TableHead>
                <TableHead className="text-center">วิชาที่สอนทั้งหมด</TableHead>
                <TableHead className="text-center">โหลดคะแนนแล้ว</TableHead>
                <TableHead>ยังไม่โหลดเลย</TableHead>
                <TableHead className="text-center">หน่วยที่โหลดรวม</TableHead>
                <TableHead>อัปเดตล่าสุด</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {level1Rows.map((row) => (
                <TableRow
                  key={classKey(row.grade, row.classroom)}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedGrade(row.grade)}
                >
                  <TableCell className="font-medium">
                    {row.grade}/{row.classroom}
                  </TableCell>
                  <TableCell className="text-center">{row.subjectsTaught.size}</TableCell>
                  <TableCell className="text-center">{row.subjectsUploaded.size}</TableCell>
                  <TableCell>
                    {row.missingSubjects.length === 0 ? (
                      <Badge variant="secondary">ครบแล้ว</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.missingSubjects.map((s) => (
                          <Badge key={s} variant="destructive">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{row.unitsUploaded.size}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.lastUpdated ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {level1Rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    ไม่พบข้อมูลการสอนในภาคเรียนนี้
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ระดับ 2: เจาะชั้น — วิชา × ห้อง */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">เจาะรายชั้น — วิชา × ห้อง</CardTitle>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="เลือกชั้น" />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!level2 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              คลิกแถวในตารางด้านบน หรือเลือกชั้นเพื่อดูรายละเอียด
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วิชา</TableHead>
                  {level2.classroomsInGrade.map((c) => (
                    <TableHead key={c} className="text-center">
                      {selectedGrade}/{c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {level2.subjectsInGrade.map((subject) => (
                  <TableRow key={subject}>
                    <TableCell className="font-medium">{subject}</TableCell>
                    {level2.classroomsInGrade.map((c) => {
                      const entry = level2.cell.get(`${subject}|${c}`);
                      const units = entry?.units ?? [];
                      return (
                        <TableCell key={c} className="text-center">
                          {units.length === 0 ? (
                            <Badge variant="destructive">0</Badge>
                          ) : (
                            <span className="text-sm">{units.join(", ")}</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {level2.subjectsInGrade.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={level2.classroomsInGrade.length + 1}
                      className="text-center text-muted-foreground py-6"
                    >
                      ไม่พบวิชาที่สอนในชั้นนี้
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
