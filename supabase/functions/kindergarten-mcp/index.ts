import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, mcp-session-id",
};

const DOMAIN_LABEL: Record<string, string> = {
  physical: "สุขภาวะทางกาย",
  emotional_social: "อารมณ์ จิตใจ และสังคม",
  cognitive: "สติปัญญา",
  citizenship: "ความเป็นพลเมือง",
};
const DOMAIN_CODES = Object.keys(DOMAIN_LABEL);

const TOOLS = [
  {
    name: "kinder_list_classrooms",
    description: "รายการห้องเรียนอนุบาลทั้งหมด พร้อมจำนวนนักเรียน",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "kinder_classroom_summary",
    description: "สรุปคะแนนเฉลี่ย 4 ด้านพัฒนาการรายห้อง (กรองวัน/ห้องได้)",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "ย้อนหลังกี่วัน (default 28)" },
        classroom: { type: "string", description: 'ห้องที่ต้องการ เช่น "อ.1/A" — ถ้าไม่ระบุ = ทุกห้อง' },
      },
    },
  },
  {
    name: "kinder_at_risk",
    description: "รายชื่อเด็กกลุ่มเสี่ยง คะแนนเฉลี่ยต่ำกว่าเกณฑ์ (default avg < 2.0 จากเต็ม 3)",
    inputSchema: {
      type: "object",
      properties: {
        days: { type: "number", description: "ย้อนหลังกี่วัน (default 28)" },
        threshold: { type: "number", description: "เกณฑ์ขั้นต่ำ (default 2.0)" },
      },
    },
  },
  {
    name: "kinder_student_profile",
    description: "พัฒนาการรายนักเรียน — ประวัติคะแนนทุกด้าน/พฤติกรรมรายบุคคล",
    inputSchema: {
      type: "object",
      properties: {
        student_id: { type: "string", description: "UUID นักเรียน (จาก kinder_list_students)" },
      },
      required: ["student_id"],
    },
  },
  {
    name: "kinder_list_students",
    description: "รายชื่อนักเรียนรายห้อง พร้อม avg 28 วันล่าสุด และ student_id สำหรับ profile",
    inputSchema: {
      type: "object",
      properties: {
        classroom: { type: "string", description: 'ห้อง เช่น "อ.1/A"' },
      },
      required: ["classroom"],
    },
  },
  {
    name: "kinder_domain_detail",
    description: "พฤติกรรมรายด้านรายห้อง เรียงจากอ่อนสุด — ใช้หาจุดพัฒนา",
    inputSchema: {
      type: "object",
      properties: {
        classroom: { type: "string", description: 'ห้อง เช่น "อ.1/A"' },
        domain_code: {
          type: "string",
          enum: DOMAIN_CODES,
          description: "physical=สุขภาวะทางกาย, emotional_social=อารมณ์จิตใจฯ, cognitive=สติปัญญา, citizenship=ความเป็นพลเมือง",
        },
        days: { type: "number", description: "ย้อนหลังกี่วัน (default 28)" },
      },
      required: ["classroom", "domain_code"],
    },
  },
  {
    name: "kinder_lesson_plans",
    description: "แผนการสอนรายหน่วย กรองรายห้องได้",
    inputSchema: {
      type: "object",
      properties: {
        classroom: { type: "string", description: 'ห้อง เช่น "อ.1/A" — ถ้าไม่ระบุ = ทุกห้อง' },
      },
    },
  },
];

// ── Input validation ──────────────────────────────
// exec_sql (SECURITY DEFINER, service_role-only) runs raw SQL built by string
// interpolation below — safe when this ran as a local-only stdio process, NOT
// safe now that it's an internet-reachable endpoint. Every value that reaches
// a SQL builder is validated here first; anything that doesn't match is
// rejected rather than escaped, since these are structured identifiers
// (UUIDs, room codes, a closed enum, bounded numbers), not free text.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Thai + Latin letters, digits, dot, slash, space, hyphen — matches room codes like "อ.1/A".
const CLASSROOM_RE = /^[฀-๿a-zA-Z0-9./\- ]{1,30}$/;

function assertUuid(v: unknown, field: string): string {
  if (typeof v !== "string" || !UUID_RE.test(v)) throw new Error(`${field} ต้องเป็น UUID ที่ถูกต้อง`);
  return v;
}
function assertClassroom(v: unknown, field: string): string {
  if (typeof v !== "string" || !CLASSROOM_RE.test(v)) throw new Error(`${field} มีอักขระที่ไม่อนุญาต`);
  return v;
}
function assertDomainCode(v: unknown): string {
  if (typeof v !== "string" || !DOMAIN_CODES.includes(v)) throw new Error(`domain_code ต้องเป็นหนึ่งใน: ${DOMAIN_CODES.join(", ")}`);
  return v;
}
function boundedInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
function boundedNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
/** Single-quote escape for values that passed charset/enum validation above
 * but are still interpolated as SQL string literals. */
function q(v: string): string {
  return v.replace(/'/g, "''");
}

// ── SQL builders (ported from ~/kindergarten-mcp/src/index.js) ───────────

function listClassroomsSql() {
  return `
SELECT c.level || '/' || COALESCE(c.section,'') AS classroom,
  c.level, c.section,
  COUNT(DISTINCT s.id) AS student_count
FROM kindergarten.classrooms c
LEFT JOIN kindergarten.students s ON s.classroom_id = c.id
GROUP BY c.id, c.level, c.section ORDER BY c.level, c.section`;
}

function classroomSummarySql(days: number, classroom: string | null) {
  const roomFilter = classroom
    ? `AND (c.level || '/' || COALESCE(c.section,'')) = '${q(classroom)}'` : "";
  return `
SELECT c.level || '/' || COALESCE(c.section,'') AS classroom,
  bd.domain_code,
  ROUND(AVG(a.score)::numeric, 2) AS avg_score,
  COUNT(*) AS assessment_count,
  COUNT(DISTINCT a.student_id) AS student_count
FROM kindergarten.assessments a
JOIN kindergarten.students s ON s.id = a.student_id
JOIN kindergarten.classrooms c ON c.id = s.classroom_id
JOIN kindergarten.behaviors b ON b.id = a.behavior_id
JOIN kindergarten.behavior_domains bd ON bd.behavior_id = b.id
WHERE a.created_at >= now() - interval '${days} days' ${roomFilter}
GROUP BY c.level, c.section, bd.domain_code
ORDER BY classroom, bd.domain_code`;
}

function atRiskSql(days: number, threshold: number) {
  return `
SELECT c.level || '/' || COALESCE(c.section,'') AS classroom,
  s.full_name AS student_name, s.id AS student_id,
  ROUND(AVG(a.score)::numeric, 2) AS overall_avg,
  COUNT(*) AS assessment_count
FROM kindergarten.assessments a
JOIN kindergarten.students s ON s.id = a.student_id
JOIN kindergarten.classrooms c ON c.id = s.classroom_id
WHERE a.created_at >= now() - interval '${days} days'
GROUP BY c.id, c.level, c.section, s.id, s.full_name
HAVING AVG(a.score) < ${threshold}
ORDER BY classroom, overall_avg`;
}

function studentProfileSql(studentId: string) {
  return `
SELECT s.full_name, c.level || '/' || COALESCE(c.section,'') AS classroom,
  bd.domain_code, b.behavior_text AS behavior_name,
  a.score, DATE(a.created_at) AS assessed_date
FROM kindergarten.assessments a
JOIN kindergarten.students s ON s.id = a.student_id
JOIN kindergarten.classrooms c ON c.id = s.classroom_id
JOIN kindergarten.behaviors b ON b.id = a.behavior_id
JOIN kindergarten.behavior_domains bd ON bd.behavior_id = b.id
WHERE a.student_id = '${studentId}'
ORDER BY bd.domain_code, a.created_at DESC LIMIT 100`;
}

function listStudentsSql(classroom: string) {
  const [level, section] = classroom.split("/");
  const sectionFilter = section ? `AND c.section = '${q(section)}'` : "";
  return `
SELECT s.id AS student_id, s.full_name,
  c.level || '/' || COALESCE(c.section,'') AS classroom,
  ROUND(AVG(a.score)::numeric, 2) AS recent_avg,
  MAX(DATE(a.created_at)) AS last_assessed
FROM kindergarten.students s
JOIN kindergarten.classrooms c ON c.id = s.classroom_id
LEFT JOIN kindergarten.assessments a
  ON a.student_id = s.id AND a.created_at >= now() - interval '28 days'
WHERE c.level = '${q(level)}' ${sectionFilter}
GROUP BY s.id, s.full_name, c.level, c.section
ORDER BY s.full_name`;
}

function domainDetailSql(classroom: string, domainCode: string, days: number) {
  const [level, section] = classroom.split("/");
  const sectionFilter = section ? `AND c.section = '${q(section)}'` : "";
  return `
SELECT b.behavior_text AS behavior_name,
  ROUND(AVG(a.score)::numeric, 2) AS avg_score,
  COUNT(*) AS n, MIN(a.score) AS min_score, MAX(a.score) AS max_score
FROM kindergarten.assessments a
JOIN kindergarten.students s ON s.id = a.student_id
JOIN kindergarten.classrooms c ON c.id = s.classroom_id
JOIN kindergarten.behaviors b ON b.id = a.behavior_id
JOIN kindergarten.behavior_domains bd ON bd.behavior_id = b.id
WHERE bd.domain_code = '${domainCode}'
  AND c.level = '${q(level)}' ${sectionFilter}
  AND a.created_at >= now() - interval '${days} days'
GROUP BY b.behavior_text ORDER BY avg_score ASC`;
}

function lessonPlansSql(classroom: string | null) {
  const filter = classroom
    ? `WHERE lp.classroom_id IN (
         SELECT id FROM kindergarten.classrooms
         WHERE level || '/' || COALESCE(section,'') = '${q(classroom)}'
       )` : "";
  return `
SELECT lp.topic AS title, lp.week_no, lp.term,
  lp.unit_name,
  c.level || '/' || COALESCE(c.section,'') AS classroom,
  lp.created_at::date AS created_date
FROM kindergarten.lesson_plans lp
LEFT JOIN kindergarten.classrooms c ON c.id = lp.classroom_id
${filter}
ORDER BY lp.term, lp.week_no LIMIT 50`;
}

// ── Execute query ──────────────────────────────

async function executeQuery(supabase: any, rawSql: string): Promise<any[]> {
  const { data, error } = await supabase.rpc("exec_sql", { sql: rawSql });
  if (error) throw new Error(`SQL Error: ${error.message}`);
  if (Array.isArray(data)) return data;
  if (data === null) return [];
  if (typeof data === "string") { try { return JSON.parse(data); } catch { return []; } }
  return data;
}

// ── Format results ─────────────────────────────

function scoreBar(score: number, max: number) {
  const p = score / max;
  return p >= 0.8 ? "🟢" : p >= 0.6 ? "🟡" : "🔴";
}

function formatResult(toolName: string, rows: any[], args: any): string {
  if (!rows || rows.length === 0) return "📭 ไม่พบข้อมูลตามเงื่อนไขที่ระบุ";

  if (toolName === "kinder_list_classrooms") {
    return `🏫 ห้องเรียนอนุบาล (${rows.length} ห้อง)\n` +
      rows.map((r) => `  • ${r.classroom} — ${r.student_count} คน`).join("\n");
  }

  if (toolName === "kinder_classroom_summary") {
    const byRoom: Record<string, any[]> = {};
    for (const r of rows) { (byRoom[r.classroom] = byRoom[r.classroom] || []).push(r); }
    let out = `📊 สรุป 4 ด้าน (ย้อนหลัง ${args.days ?? 28} วัน)\n`;
    for (const [room, data] of Object.entries(byRoom)) {
      out += `\n🏫 ${room} (${data[0]?.student_count ?? "-"} คน)\n`;
      for (const d of data) {
        const lbl = DOMAIN_LABEL[d.domain_code] ?? d.domain_code;
        const warn = Number(d.avg_score) < 2.0 ? " ⚠️" : "";
        out += `  ${scoreBar(Number(d.avg_score), 3)} ${lbl}: ${d.avg_score}${warn}  (${d.assessment_count} ครั้ง)\n`;
      }
    }
    return out;
  }

  if (toolName === "kinder_at_risk") {
    let out = `⚠️ เด็กกลุ่มเสี่ยง avg < ${args.threshold ?? 2.0}  พบ ${rows.length} คน\n`;
    let cur = "";
    for (const r of rows) {
      if (r.classroom !== cur) { cur = r.classroom; out += `\n🏫 ${cur}\n`; }
      out += `  • ${r.student_name}  avg: ${r.overall_avg}  (${r.assessment_count} ครั้ง)\n`;
    }
    return out;
  }

  if (toolName === "kinder_student_profile") {
    const name = rows[0].full_name;
    const cls = rows[0].classroom;
    let out = `👤 ${name}  (${cls})\n`;
    const byDomain: Record<string, any[]> = {};
    for (const r of rows) {
      const lbl = DOMAIN_LABEL[r.domain_code] ?? r.domain_code;
      (byDomain[lbl] = byDomain[lbl] || []).push(r);
    }
    for (const [d, items] of Object.entries(byDomain)) {
      out += `\n📌 ${d}\n`;
      for (const i of items) {
        out += `  [${i.assessed_date}] ${i.behavior_name}: ${i.score}/3\n`;
      }
    }
    return out;
  }

  if (toolName === "kinder_list_students") {
    let out = `👥 นักเรียน ${args.classroom} (${rows.length} คน)\n`;
    for (const r of rows) {
      const avg = r.recent_avg ?? "—";
      const last = r.last_assessed ?? "ยังไม่มี";
      out += `  ${r.full_name}  avg: ${avg}  ล่าสุด: ${last}  [${r.student_id}]\n`;
    }
    return out;
  }

  if (toolName === "kinder_domain_detail") {
    const lbl = DOMAIN_LABEL[args.domain_code] ?? args.domain_code;
    let out = `📋 ${args.classroom} — ด้าน${lbl} (เรียงอ่อน→ดี)\n\n`;
    for (const r of rows) {
      out += `${scoreBar(Number(r.avg_score), 3)} ${r.behavior_name}\n`;
      out += `   avg: ${r.avg_score}  (min ${r.min_score} / max ${r.max_score} / n=${r.n})\n`;
    }
    return out;
  }

  if (toolName === "kinder_lesson_plans") {
    let out = `📖 แผนการสอน${args.classroom ? " — " + args.classroom : " ทุกห้อง"}\n\n`;
    for (const r of rows) {
      out += `📅 ภาคเรียน ${r.term ?? "-"}  สัปดาห์ ${r.week_no ?? "-"}\n`;
      out += `  หน่วย: ${r.unit_name ?? "-"}\n`;
      out += `  หัวข้อ: ${r.title ?? "-"}  (${r.classroom ?? "-"})\n\n`;
    }
    return out;
  }

  return JSON.stringify(rows, null, 2);
}

// ── Tool dispatch ──────────────────────────────

async function callTool(supabase: any, name: string, args: any): Promise<any> {
  try {
    let rawSql = "";
    switch (name) {
      case "kinder_list_classrooms":
        rawSql = listClassroomsSql();
        break;
      case "kinder_classroom_summary":
        rawSql = classroomSummarySql(
          boundedInt(args.days, 28, 1, 365),
          args.classroom != null ? assertClassroom(args.classroom, "classroom") : null
        );
        break;
      case "kinder_at_risk":
        rawSql = atRiskSql(boundedInt(args.days, 28, 1, 365), boundedNum(args.threshold, 2.0, 0, 3));
        break;
      case "kinder_student_profile":
        if (!args.student_id) throw new Error("ต้องระบุ student_id");
        rawSql = studentProfileSql(assertUuid(args.student_id, "student_id"));
        break;
      case "kinder_list_students":
        if (!args.classroom) throw new Error("ต้องระบุ classroom");
        rawSql = listStudentsSql(assertClassroom(args.classroom, "classroom"));
        break;
      case "kinder_domain_detail":
        if (!args.classroom) throw new Error("ต้องระบุ classroom");
        if (!args.domain_code) throw new Error("ต้องระบุ domain_code");
        rawSql = domainDetailSql(
          assertClassroom(args.classroom, "classroom"),
          assertDomainCode(args.domain_code),
          boundedInt(args.days, 28, 1, 365)
        );
        break;
      case "kinder_lesson_plans":
        rawSql = lessonPlansSql(args.classroom != null ? assertClassroom(args.classroom, "classroom") : null);
        break;
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
    const rows = await executeQuery(supabase, rawSql);
    return { content: [{ type: "text", text: formatResult(name, rows, args) }] };
  } catch (err: any) {
    return { content: [{ type: "text", text: `❌ Error: ${err.message}` }], isError: true };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method === "HEAD" || req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", server: "Woranat_Kindergarten_MCP", version: "2.0.0" }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  const expectedKey = Deno.env.get("KINDERGARTEN_MCP_API_KEY");
  const providedKey = req.headers.get("x-api-key");
  if (!expectedKey || !providedKey || providedKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  const { method, params, id } = body;

  if (method?.startsWith("notifications/")) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  // Service-role client: kindergarten schema isn't exposed via PostgREST, so
  // reads go through exec_sql (SECURITY DEFINER, service_role-only — see the
  // WP-S1 corrective migration restoring that grant).
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let result: any;
  try {
    switch (method) {
      case "initialize":
        result = { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "Woranat_Kindergarten_MCP", version: "2.0.0" } };
        break;
      case "ping":
        result = {};
        break;
      case "tools/list":
        result = { tools: TOOLS };
        break;
      case "tools/call":
        result = await callTool(supabase, params?.name, params?.arguments || {});
        break;
      default:
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code: -32601, message: `Method not found: ${method}` } }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code: -32603, message: err.message } }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
  });
});
