/**
 * HARD RULE: Source of truth = atlas-report-2026-02-18-6.csv ONLY
 * ห้าม AI คิดเลขเอง — ต้องดึงจาก CSV เท่านั้น
 */
import { useQuery } from "@tanstack/react-query";

const CSV_URL = "/data/atlas-report-2026-02-18-6.csv";

export interface CSVLogRow {
  id: string;
  teaching_date: string;
  grade_level: string;
  classroom: string;
  subject: string;
  learning_unit: string;
  topic: string;
  mastery_score: number;
  activity_mode: string;
  key_issue: string;
  major_gap: string;
  total_students: number;
  remedial_ids: string;
  remedial_count: number;
  gap_rate_pct: number;
  next_strategy: string;
  reflection: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function parseRemedialCount(remedialIds: string): number {
  const s = (remedialIds || "").trim();
  if (!s || s === "[None]" || s === "[N/A]") return 0;
  return s.split(",").map((x) => x.trim()).filter(Boolean).length;
}

async function fetchAndParseCSV(): Promise<CSVLogRow[]> {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const rows: CSVLogRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 16) continue;
    const teaching_date = cols[0]?.replace(/"/g, "") || "";
    const grade_level = cols[1]?.replace(/"/g, "") || "";
    const classroom = cols[2]?.replace(/"/g, "") || "";
    const total_students = parseInt(cols[3]?.replace(/"/g, "") || "0", 10) || 0;
    const subject = cols[4]?.replace(/"/g, "") || "";
    const remedial_ids = cols[14]?.replace(/"/g, "") || "";
    const remedial_count = parseRemedialCount(remedial_ids);
    const gap_rate_pct = total_students > 0 ? (remedial_count / total_students) * 100 : 0;

    rows.push({
      id: `csv-${i}-${teaching_date}-${grade_level}-${classroom}-${subject}`,
      teaching_date,
      grade_level,
      classroom,
      subject,
      learning_unit: cols[5]?.replace(/"/g, "") || "",
      topic: cols[6]?.replace(/"/g, "") || "",
      mastery_score: parseInt(cols[7]?.replace(/"/g, "") || "0", 10) || 0,
      activity_mode: cols[8]?.replace(/"/g, "") || "active",
      key_issue: cols[9]?.replace(/"/g, "") || "",
      major_gap: cols[10]?.replace(/"/g, "") || "success",
      total_students,
      remedial_ids,
      remedial_count,
      gap_rate_pct,
      next_strategy: cols[15]?.replace(/"/g, "") || "",
      reflection: cols[16]?.replace(/"/g, "") || "",
    });
  }
  return rows;
}

/**
 * PIVOT: Gap > 40% สองครั้งติดต่อกันในวิชาเดียวกัน (subject + grade + classroom)
 * Returns Set of row ids that should show PIVOT MODE
 */
function computePivotSet(rows: CSVLogRow[]): Set<string> {
  const pivotIds = new Set<string>();
  const byKey = new Map<string, CSVLogRow[]>();
  for (const r of rows) {
    const key = `${r.grade_level}/${r.classroom}|${r.subject}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(r);
  }
  for (const arr of byKey.values()) {
    const sorted = [...arr].sort(
      (a, b) => new Date(a.teaching_date).getTime() - new Date(b.teaching_date).getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevGap40 = prev.gap_rate_pct > 40;
      const currGap40 = curr.gap_rate_pct > 40;
      if (prevGap40 && currGap40) {
        pivotIds.add(curr.id);
      }
    }
  }
  return pivotIds;
}

export function useAtlasCSVData() {
  const query = useQuery({
    queryKey: ["atlas-csv-source"],
    queryFn: fetchAndParseCSV,
    staleTime: Infinity, // CSV is source of truth, rarely changes
  });

  const rows = query.data ?? [];
  const pivotSet = computePivotSet(rows);

  return {
    csvRows: rows,
    pivotSet,
    isLoading: query.isLoading,
    error: query.error,
    isCSVLoaded: rows.length > 0,
  };
}
