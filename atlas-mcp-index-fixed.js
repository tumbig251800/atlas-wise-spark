#!/usr/bin/env node
/**
 * ATLAS MCP Server v1.0.0
 * MCP server for ATLAS teaching log analysis
 * โรงเรียนวรนาถวิทยากำแพงเพชร
 *
 * Tools:
 *   atlas_list_terms        — แสดงภาคเรียนทั้งหมด
 *   atlas_classroom_kpi     — KPI รายชั้น × ห้อง
 *   atlas_gap_distribution  — Gap distribution (แยก SC แล้ว)
 *   atlas_key_issues        — ตัวอย่าง key_issue สำหรับ evidence
 *   atlas_integrity_flags   — Integrity Audit FLAG 1–5
 *   atlas_teacher_list      — รายชื่อครูผู้สอน
 *   atlas_red_zone          — บันทึก Red Zone (mastery ≤ 2.5)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  process.stderr.write(
    "[ATLAS MCP] ❌ ต้องตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY\n"
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getLogs({ term, grade, classroom, subject } = {}) {
  let q = db.from("teaching_logs").select("*");
  if (term)      q = q.eq("academic_term", term);
  if (grade)     q = q.eq("grade_level", grade);
  if (classroom) q = q.eq("classroom", classroom);
  if (subject)   q = q.ilike("subject", `%${subject}%`);
  const { data, error } = await q.order("teaching_date", { ascending: false });
  if (error) throw new Error(`DB error: ${error.message}`);
  return data || [];
}

const ok  = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });
const err = (msg) => ({ isError: true, content: [{ type: "text", text: `❌ ${msg}` }] });

// ── Tool Definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "atlas_list_terms",
    description: "แสดงรายการภาคเรียน (academic_term) ทั้งหมดในระบบ พร้อมจำนวนบันทึก",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "atlas_classroom_kpi",
    description:
      "ดึง KPI รายชั้น × ห้อง: avg_mastery, gap counts, SC%, red_zone, teacher_name, sc_high_alert. " +
      "กรอง term / grade / classroom / subject ได้",
    inputSchema: {
      type: "object",
      properties: {
        term:      { type: "string", description: "ภาคเรียน เช่น '2568-2'" },
        grade:     { type: "string", description: "ระดับชั้น เช่น 'ป.4'" },
        classroom: { type: "string", description: "ห้อง เช่น '1'" },
        subject:   { type: "string", description: "วิชา เช่น 'คณิตศาสตร์'" },
      },
    },
  },
  {
    name: "atlas_gap_distribution",
    description:
      "Gap distribution ภายหลังแยก SC ออก (Compassion Protocol) พร้อม % " +
      "ใช้สำหรับวิเคราะห์ K/P/A/A2/System-Gap",
    inputSchema: {
      type: "object",
      properties: {
        term:      { type: "string" },
        grade:     { type: "string" },
        classroom: { type: "string" },
        subject:   { type: "string" },
      },
    },
  },
  {
    name: "atlas_key_issues",
    description:
      "ดึงตัวอย่าง key_issue (กรอง SC และ success ออก) สำหรับใช้เป็น evidence ในรายงาน",
    inputSchema: {
      type: "object",
      properties: {
        term:      { type: "string" },
        grade:     { type: "string" },
        classroom: { type: "string" },
        subject:   { type: "string" },
        gap_type:  { type: "string", description: "กรอง gap เช่น 'k-gap', 'p-gap'" },
        limit:     { type: "number", description: "จำนวนสูงสุด (default 10)", default: 10 },
      },
    },
  },
  {
    name: "atlas_integrity_flags",
    description:
      "รัน Integrity Audit FLAG 1–6: SC ไม่มี ID / SC มี ID=[None] / mastery ขัดแย้ง / " +
      "a-gap ไม่มีแผนดูแล / a2-gap Referral / Red Zone",
    inputSchema: {
      type: "object",
      properties: {
        term:      { type: "string" },
        grade:     { type: "string" },
        classroom: { type: "string" },
      },
    },
  },
  {
    name: "atlas_teacher_list",
    description: "รายชื่อครูผู้สอน พร้อมชั้น × ห้อง × วิชา และจำนวนบันทึก",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string" },
      },
    },
  },
  {
    name: "get_open_student_support_plans",
    description: "ดึง Student Support Plan ที่ยังเปิดอยู่ (status='open') สำหรับนักเรียนที่มีปัญหา a-gap/a2-gap (ไม่ใช่เด็กป่วย) เรียงตาม follow_up_date",
    inputSchema: {
      type: "object",
      properties: {
        teacher_id: { type: "string", description: "UUID ของครู (optional) กรองเฉพาะแผนของครูคนนั้น" },
      },
    },
  },
  {
    name: "atlas_red_zone",
    description: "บันทึกที่ mastery ≤ 2.5 (Red Zone) พร้อม key_issue และ teacher_name",
    inputSchema: {
      type: "object",
      properties: {
        term:      { type: "string" },
        grade:     { type: "string" },
        classroom: { type: "string" },
      },
    },
  },
];

// ── Server Setup ──────────────────────────────────────────────────────────────
const server = new Server(
  { name: "atlas-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

// ── Tool Handlers ─────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    switch (name) {

      // ── atlas_list_terms ────────────────────────────────────────────────────
      case "atlas_list_terms": {
        const logs = await getLogs();
        const terms = {};
        for (const l of logs) {
          terms[l.academic_term] = (terms[l.academic_term] || 0) + 1;
        }
        return ok(
          Object.entries(terms)
            .sort()
            .map(([term, total_logs]) => ({ term, total_logs }))
        );
      }

      // ── atlas_classroom_kpi ─────────────────────────────────────────────────
      case "atlas_classroom_kpi": {
        const logs = await getLogs(args);
        const map = {};
        for (const l of logs) {
          const key = `${l.grade_level}|${l.classroom}`;
          if (!map[key]) {
            map[key] = {
              grade_level: l.grade_level,
              classroom:   l.classroom,
              teachers: new Set(),
              subjects: new Set(),
              total_logs: 0, mastery_sum: 0,
              sc_count: 0, red_zone: 0,
              success: 0, k_gap: 0, p_gap: 0,
              a_gap: 0, a2_gap: 0, system_gap: 0,
            };
          }
          const r = map[key];
          r.total_logs++;
          r.mastery_sum += l.mastery_score || 0;
          if (l.teacher_name) r.teachers.add(l.teacher_name);
          if (l.subject)      r.subjects.add(l.subject);
          if (l.health_care_status) {
            r.sc_count++;
          } else {
            if ((l.mastery_score || 0) <= 2.5) r.red_zone++;
            const g = l.major_gap;
            if      (g === "success")     r.success++;
            else if (g === "k-gap")       r.k_gap++;
            else if (g === "p-gap")       r.p_gap++;
            else if (g === "a-gap")       r.a_gap++;
            else if (g === "a2-gap")      r.a2_gap++;
            else if (g === "system-gap")  r.system_gap++;
          }
        }
        return ok(
          Object.values(map)
            .sort((a, b) =>
              a.grade_level.localeCompare(b.grade_level) ||
              a.classroom.localeCompare(b.classroom)
            )
            .map((r) => ({
              grade_level:    r.grade_level,
              classroom:      r.classroom,
              teachers:       [...r.teachers],
              subjects:       [...r.subjects],
              total_logs:     r.total_logs,
              avg_mastery:    r.total_logs ? +(r.mastery_sum / r.total_logs).toFixed(2) : 0,
              sc_count:       r.sc_count,
              sc_pct:         r.total_logs ? +((r.sc_count / r.total_logs) * 100).toFixed(1) : 0,
              sc_high_alert:  r.sc_count / r.total_logs > 0.4,
              red_zone:       r.red_zone,
              non_sc_logs:    r.total_logs - r.sc_count,
              success:        r.success,
              k_gap:          r.k_gap,
              p_gap:          r.p_gap,
              a_gap:          r.a_gap,
              a2_gap_referral: r.a2_gap,
              system_gap:     r.system_gap,
            }))
        );
      }

      // ── atlas_gap_distribution ──────────────────────────────────────────────
      case "atlas_gap_distribution": {
        const logs = (await getLogs(args)).filter((l) => !l.health_care_status);
        const total = logs.length;
        const counts = { success: 0, "k-gap": 0, "p-gap": 0, "a-gap": 0, "a2-gap": 0, "system-gap": 0 };
        for (const l of logs) {
          if (l.major_gap in counts) counts[l.major_gap]++;
        }
        return ok({
          total_non_sc_logs: total,
          note: "SC logs excluded (Compassion Protocol)",
          distribution: Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([gap, count]) => ({
              gap,
              count,
              pct: total ? +((count / total) * 100).toFixed(1) : 0,
            })),
        });
      }

      // ── atlas_key_issues ────────────────────────────────────────────────────
      case "atlas_key_issues": {
        const { gap_type, limit = 10, ...filters } = args;
        let logs = (await getLogs(filters)).filter(
          (l) =>
            !l.health_care_status &&
            l.major_gap !== "success" &&
            l.key_issue &&
            l.key_issue.trim() !== "-"
        );
        if (gap_type) logs = logs.filter((l) => l.major_gap === gap_type);
        logs.sort(
          (a, b) =>
            (a.mastery_score || 0) - (b.mastery_score || 0) ||
            (b.teaching_date || "").localeCompare(a.teaching_date || "")
        );
        return ok(
          logs.slice(0, limit).map((l) => ({
            teaching_date:  l.teaching_date,
            grade_level:    l.grade_level,
            classroom:      l.classroom,
            subject:        l.subject,
            major_gap:      l.major_gap,
            mastery_score:  l.mastery_score,
            key_issue:      l.key_issue,
            activity_mode:  l.activity_mode,
          }))
        );
      }

      // ── atlas_integrity_flags ───────────────────────────────────────────────
      case "atlas_integrity_flags": {
        const logs = await getLogs(args);
        const flags = [
          {
            flag: "FLAG1",
            description: "SC=true แต่ไม่มี health_care_ids",
            records: logs
              .filter((l) => l.health_care_status && (!l.health_care_ids || l.health_care_ids.trim() === ""))
              .map((l) => ({ id: l.id, grade_level: l.grade_level, classroom: l.classroom, teaching_date: l.teaching_date })),
          },
          {
            flag: "FLAG2",
            description: "mastery=5 แต่ระบุ gap (ขัดแย้ง)",
            records: logs
              .filter((l) => !l.health_care_status && l.mastery_score === 5 && l.major_gap !== "success")
              .map((l) => ({ id: l.id, grade_level: l.grade_level, classroom: l.classroom, major_gap: l.major_gap, teaching_date: l.teaching_date })),
          },
          {
            flag: "FLAG3",
            description: "a-gap แต่ไม่มี remedial_ids — ครูระบุปัญหาทัศนคติแต่ยังไม่มีแผนดูแล/ซ่อมเสริมใด",
            records: logs
              .filter((l) => l.major_gap === "a-gap" && (!l.remedial_ids || l.remedial_ids.trim() === ""))
              .map((l) => ({ id: l.id, grade_level: l.grade_level, classroom: l.classroom, subject: l.subject, teaching_date: l.teaching_date, key_issue: l.key_issue })),
          },
          {
            flag: "FLAG4",
            description: "a2-gap (พฤติกรรมก้าวร้าว) ต้องมีกระบวนการส่งต่อ Welfare/แนะแนว",
            records: logs
              .filter((l) => l.major_gap === "a2-gap")
              .map((l) => ({ id: l.id, grade_level: l.grade_level, classroom: l.classroom, teacher_name: l.teacher_name, teaching_date: l.teaching_date })),
          },
          {
            flag: "FLAG5",
            description: "Red Zone (mastery ≤ 2.5) ต้องมีแผนซ่อมเสริม",
            records: logs
              .filter((l) => (l.mastery_score || 0) <= 2.5)
              .map((l) => ({ id: l.id, grade_level: l.grade_level, classroom: l.classroom, subject: l.subject, mastery_score: l.mastery_score, teaching_date: l.teaching_date, key_issue: l.key_issue })),
          },
          {
            flag: "FLAG6",
            description: "health_care_status=true แต่ health_care_ids=[None] — ข้อมูลขัดแย้ง ครูเลือกว่ามีเด็กป่วยแต่ ID เป็น [None]",
            records: logs
              .filter((l) => l.health_care_status && l.health_care_ids && l.health_care_ids.trim() === "[None]")
              .map((l) => ({ id: l.id, grade_level: l.grade_level, classroom: l.classroom, teaching_date: l.teaching_date, health_care_ids: l.health_care_ids })),
          },
        ];
        return ok(
          flags.map((f) => ({
            flag:        f.flag,
            status:      f.records.length > 0 ? "⚠️ FOUND" : "✅ CLEAN",
            count:       f.records.length,
            description: f.description,
            records:     f.records,
          }))
        );
      }

      // ── atlas_teacher_list ──────────────────────────────────────────────────
      case "atlas_teacher_list": {
        const logs = await getLogs(args);
        const map = {};
        for (const l of logs) {
          const key = `${l.teacher_name}|${l.grade_level}|${l.classroom}|${l.subject}`;
          if (!map[key]) {
            map[key] = {
              teacher_name: l.teacher_name,
              grade_level:  l.grade_level,
              classroom:    l.classroom,
              subject:      l.subject,
              log_count:    0,
            };
          }
          map[key].log_count++;
        }
        return ok(
          Object.values(map).sort(
            (a, b) =>
              (a.grade_level || "").localeCompare(b.grade_level || "") ||
              (a.classroom   || "").localeCompare(b.classroom   || "")
          )
        );
      }

      // ── get_open_student_support_plans ────────────────────────────────────────
      case "get_open_student_support_plans": {
        let q = db.from("student_support_plans").select("*").eq("status", "open");
        if (args.teacher_id) q = q.eq("teacher_id", args.teacher_id);
        const { data, error } = await q.order("follow_up_date", { ascending: true });
        if (error) throw new Error(`DB error: ${error.message}`);
        return ok(data || []);
      }

      // ── atlas_red_zone ──────────────────────────────────────────────────────
      case "atlas_red_zone": {
        const logs = (await getLogs(args)).filter((l) => (l.mastery_score || 0) <= 2.5);
        return ok(
          logs.map((l) => ({
            teaching_date:      l.teaching_date,
            teacher_name:       l.teacher_name,
            grade_level:        l.grade_level,
            classroom:          l.classroom,
            subject:            l.subject,
            mastery_score:      l.mastery_score,
            major_gap:          l.major_gap,
            key_issue:          l.key_issue,
            health_care_status: l.health_care_status,
          }))
        );
      }

      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return err(e.message);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write("[ATLAS MCP] ✅ Server started\n");
