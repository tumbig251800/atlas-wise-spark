export const INCREMENTAL_TOOL_DEFINITIONS = [
  {
    name: "atlas_change_feed",
    description: "คืน teaching logs ที่สร้างหรือแก้ไขหลัง cursor ล่าสุดสำหรับ incremental sync โดยไม่รวมข้อมูลรายบุคคล Special Care",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน เช่น 2569-1" },
        updated_after: { type: "string", description: "ISO timestamp ของการซิงก์ล่าสุด" },
        after_id: { type: "string", description: "ใช้คู่กับ updated_after เพื่อกันข้อมูลตกหล่นเมื่อ timestamp ซ้ำ" },
        limit: { type: "number", description: "จำนวนสูงสุดต่อรอบ (default 500, max 1000)" }
      },
      required: ["term", "updated_after"]
    }
  },
  {
    name: "atlas_sync_manifest",
    description: "คืนยอดรวม เวอร์ชันตรรกะ ช่วงเวลาอัปเดต และ checksum สำหรับตรวจความสอดคล้องของ snapshot",
    inputSchema: {
      type: "object",
      properties: { term: { type: "string", description: "รหัสภาคเรียน" } },
      required: ["term"]
    }
  },
  {
    name: "atlas_report_snapshot",
    description: "คืน aggregate snapshot สำหรับสร้างรายงานผู้บริหารโดยไม่รวม Special Care ใน Gap rate",
    inputSchema: {
      type: "object",
      properties: { term: { type: "string", description: "รหัสภาคเรียน" } },
      required: ["term"]
    }
  }
];

const PAGE_SIZE = 1000;
const LOGIC_VERSION = "incremental-v1";

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchAll(supabase: any, term: string, columns: string, specialCare = false) {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let q = supabase.from("teaching_logs").select(columns).eq("academic_term", term).order("id", { ascending: true });
    q = specialCare ? q.eq("health_care_status", true) : q.or("health_care_status.is.false,health_care_status.is.null");
    const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return rows;
}

export async function callIncrementalTool(supabase: any, name: string, args: any) {
  if (name === "atlas_change_feed") {
    const limit = Math.min(Math.max(Number(args.limit ?? 500), 1), 1000);
    let q = supabase.from("teaching_logs")
      .select("id, updated_at, created_at, academic_term, teaching_date, teacher_id, teacher_name, grade_level, classroom, subject, mastery_score, major_gap, key_issue")
      .eq("academic_term", args.term)
      .or("health_care_status.is.false,health_care_status.is.null")
      .gte("updated_at", args.updated_after)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit + 1);
    const { data, error } = await q;
    if (error) throw error;
    const filtered = (data ?? []).filter((r: any) => {
      if (r.updated_at > args.updated_after) return true;
      return args.after_id ? String(r.id) > String(args.after_id) : true;
    });
    const page = filtered.slice(0, limit);
    const last = page.at(-1) ?? null;
    return {
      term: args.term,
      operation_mode: "upsert_only",
      deletion_supported: false,
      count: page.length,
      has_more: filtered.length > limit,
      next_cursor: last ? { updated_after: last.updated_at, after_id: String(last.id) } : null,
      records: page
    };
  }

  if (name === "atlas_sync_manifest") {
    const included = await fetchAll(supabase, args.term, "id,updated_at");
    const excluded = await fetchAll(supabase, args.term, "id", true);
    const latest = included.reduce((m: string | null, r: any) => !m || r.updated_at > m ? r.updated_at : m, null);
    const checksum = await sha256(JSON.stringify(included.map((r: any) => [r.id, r.updated_at])));
    return {
      term: args.term,
      term_filter_applied: true,
      included_log_count: included.length,
      excluded_special_care_count: excluded.length,
      total_log_count: included.length + excluded.length,
      latest_updated_at: latest,
      checksum,
      schema_version: "teaching_logs-v1",
      logic_version: LOGIC_VERSION,
      deletion_supported: false
    };
  }

  if (name === "atlas_report_snapshot") {
    const rows = await fetchAll(supabase, args.term, "id,grade_level,classroom,teacher_name,subject,mastery_score,major_gap,updated_at");
    const excluded = await fetchAll(supabase, args.term, "id", true);
    const classrooms: Record<string, any> = {};
    for (const r of rows) {
      const key = `${r.grade_level}|${r.classroom}`;
      const c = classrooms[key] ||= { grade_level: r.grade_level, classroom: r.classroom, n: 0, mastery_sum: 0, gaps: {}, teachers: new Set(), subjects: new Set() };
      c.n++;
      c.mastery_sum += Number(r.mastery_score ?? 0);
      c.gaps[r.major_gap] = (c.gaps[r.major_gap] || 0) + 1;
      if (r.teacher_name) c.teachers.add(r.teacher_name);
      if (r.subject) c.subjects.add(r.subject);
    }
    const classroom_kpi = Object.values(classrooms).map((c: any) => ({
      grade_level: c.grade_level,
      classroom: c.classroom,
      n: c.n,
      avg_mastery_score: c.n ? Math.round((c.mastery_sum / c.n) * 100) / 100 : 0,
      gap_distribution: c.gaps,
      gap_rate_percent: c.n ? Math.round((((c.n - (c.gaps.success || 0)) / c.n) * 100) * 10) / 10 : 0,
      teachers: Array.from(c.teachers),
      subjects: Array.from(c.subjects)
    }));
    const manifest = await callIncrementalTool(supabase, "atlas_sync_manifest", args);
    return {
      ...manifest,
      snapshot_type: "aggregate",
      special_care_excluded_from_gap_metrics: true,
      classrooms: classroom_kpi
    };
  }

  return null;
}
