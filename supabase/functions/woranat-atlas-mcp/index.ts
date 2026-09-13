// v2.10.0 (13 ก.ย. 2569) — ติดสถานะระงับกฎ UnitBlindSpot ใน atlas_wf6_candidate_audit และ atlas_action_items
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  bangkokCalendarDate,
  evaluateWf6Candidates,
  normalizeAcademicTerm,
  summarizeWf6Candidates,
  type Wf6ActionItemRow,
  type Wf6AssessmentRow,
  type Wf6ProfileRow,
  type Wf6TeachingLogRow,
} from "../_shared/wf6CandidateAudit.ts";
import {
  buildSuspensionNotice,
  isSuspendedIssueType,
  suspensionNoticesFor,
} from "../_shared/issueTypeSuspension.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-api-key, x-mcp-key, mcp-session-id",
};

// FLAG9 audit baseline — บันทึกก่อนหรือเท่ากับวันนี้ผ่านการตรวจสอบและครูยืนยันแล้ว (18 ส.ค. 2569)
const FLAG9_BASELINE = "2026-08-18";

const TOOLS = [
  {
    name: "atlas_list_terms",
    description: "แสดงรายการภาคเรียนและจำนวน teaching log แยกเป็น in_kpi (ไม่รวม Special Care) และ total (รวมทั้งหมด)",
    inputSchema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "atlas_classroom_kpi",
    description: "แสดง KPI ของแต่ละห้องเรียน — คะแนนเฉลี่ย/Gap คำนวณจากบันทึกที่ไม่รวม Special Care ตาม Compassion Protocol แต่รายงานจำนวนบันทึกทั้ง logs_total (ภาระงานจริง) และ logs_in_kpi (ฐานคำนวณ KPI)",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน เช่น 2568-2" }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_gap_distribution",
    description: "แสดงการกระจาย Gap โดยไม่รวม Special Care; A2-Gap หมายถึงพฤติกรรมก้าวร้าว/Referral เท่านั้น",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน" }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_key_issues",
    description: "แสดงปัญหาสำคัญที่พบบ่อยที่สุดในภาคเรียนที่กำหนด",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน" },
        limit: { type: "number", description: "จำนวนสูงสุด (default: 10)" }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_integrity_flags",
    description: "แสดง flag ที่ควรตรวจสอบจาก teaching log โดยไม่รวม Special Care; FLAG9 นับเฉพาะบันทึกหลังวันปรับนิยาม 18 ส.ค. 2569 (ข้อมูลก่อนหน้านั้นผ่านการตรวจสอบแล้ว); flag ไม่ใช่ข้อสรุปว่าครูผิด",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน" }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_teacher_list",
    description: "แสดงรายชื่อครูและสถิติการสอน — logs_total = ภาระงานจริงทั้งหมด (ใช้วัด compliance/ความขยัน), logs_in_kpi = ฐานคำนวณคุณภาพ (ไม่รวม Special Care), logs_special_care = จำนวนที่ถูกกันออกตาม Compassion Protocol. อย่าใช้ logs_in_kpi ตัดสินว่าครูกรอกน้อย ให้ใช้ logs_total",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน" }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_red_zone",
    description: "แสดงห้องเรียนที่อยู่ในโซนเสี่ยง (คะแนนเฉลี่ยต่ำกว่าเกณฑ์)",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน" },
        threshold: { type: "number", description: "เกณฑ์คะแนนเฉลี่ยบนสเกลข้อมูล 2–5 (default: 3.0)", minimum: 2, maximum: 5 }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_plc_sessions",
    description: "แสดง PLC sessions ที่บันทึกไว้ พร้อม outcome และ link กับ action items",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "วันที่เริ่ม YYYY-MM-DD" },
        date_to: { type: "string", description: "วันที่สิ้นสุด YYYY-MM-DD" },
        outcome_type: { type: "string", description: "filter ตามผล: resolved | need_supervision | continue_plc" }
      },
      required: []
    }
  },
  {
    name: "atlas_action_items",
    description: "แสดงสถานะ Action Board (issue_type, status, severity) พร้อม flag ว่าผ่าน PLC/Nidet หรือยัง",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", description: "filter status: open | watching | resolved | verified | dismissed" },
        teacher_id: { type: "string", description: "UUID ครู" }
      },
      required: []
    }
  },
  {
    name: "atlas_wf6_candidate_audit",
    description: "[กฎระงับแล้วตั้งแต่ 13 ก.ย. 2569 — WF-6 หยุดสร้างเคสอัตโนมัติแล้ว ณ วันที่ตรวจสอบ ผลเป็นข้อมูลประกอบเท่านั้น ไม่ใช่รายการที่ต้องเปิดเคสหรือจัดคิว PLC] ตรวจผู้สมัครเคส UnitBlindSpot ตามเงื่อนไขเดียวกับ WF-6 โดยอ่านผลหลังหน่วย บันทึกหลังสอน และ Action Board; ค่าเริ่มต้นคืนเฉพาะยอดรวมเพื่อลด PII",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน เช่น 2569-1 (บังคับ)" },
        as_of_date: { type: "string", description: "วันที่อ้างอิง YYYY-MM-DD; ไม่ใส่ = วันนี้เวลาไทย" },
        grade_level: { type: "string", description: "กรองระดับชั้น เช่น ป.6 (optional)" },
        classroom: { type: "string", description: "กรองห้อง เช่น KBW หรือ 2 (optional)" },
        subject: { type: "string", description: "กรองวิชาแบบตรงตัว (optional)" },
        include_details: { type: "boolean", description: "true = แสดงรายละเอียดที่มี PII; default false" },
        limit: { type: "number", description: "จำนวนรายละเอียดสูงสุดเมื่อ include_details=true (default 20, max 100)", minimum: 1, maximum: 100 }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_plc_effectiveness",
    description: "วิเคราะห์ประสิทธิผลของ PLC sessions - resolution rate, outcome distribution, before/after mastery comparison",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "วันที่เริ่ม YYYY-MM-DD" },
        date_to: { type: "string", description: "วันที่สิ้นสุด YYYY-MM-DD" },
        plc_type: { type: "string", description: "filter ตามประเภท: subject | grade_band | all" },
        teacher_id: { type: "string", description: "UUID ครู (optional)" }
      },
      required: []
    }
  },
  {
    name: "atlas_plc_coverage_gap",
    description: "หา action items ที่ยังไม่มี PLC ครอบคลุม แต่ยังค้างอยู่ (status = open/watching)",
    inputSchema: {
      type: "object",
      properties: {
        severity_filter: { type: "string", description: "filter ตาม severity: critical | high | medium | all (default: all)" }
      },
      required: []
    }
  },
  {
    name: "atlas_plc_timeline",
    description: "แสดง timeline ของ PLC sessions ที่เชื่อมต่อกัน (continue_plc chains) และระยะเวลาในการแก้ปัญหา",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "วันที่เริ่ม YYYY-MM-DD" },
        date_to: { type: "string", description: "วันที่สิ้นสุด YYYY-MM-DD" }
      },
      required: []
    }
  },
  {
    name: "atlas_cross_plc_opportunities",
    description: "หาโอกาสในการจัด cross-PLC - ปัญหาที่ซ้ำกันข้ามวิชา/ช่วงชั้น หรือครูคนเดียวมีหลายปัญหา",
    inputSchema: {
      type: "object",
      properties: {
        min_overlap: { type: "number", description: "จำนวน items ที่ซ้ำกันขั้นต่ำ (default: 2)" }
      },
      required: []
    }
  },
  {
    name: "atlas_plc_recommendations",
    description: "แนะนำแผน PLC จาก open items (lightweight version ของ AI Planner สำหรับ MCP/n8n)",
    inputSchema: {
      type: "object",
      properties: {
        max_plans: { type: "number", description: "จำนวนแผนสูงสุด (default: 3)" },
        prefer_type: { type: "string", description: "ประเภทที่ต้องการ: subject | grade_band | cross (optional)" },
        min_coverage_percent: { type: "number", description: "% coverage ขั้นต่ำ (default: 30)" }
      },
      required: []
    }
  },
  {
    name: "atlas_pbl_summary",
    description: "สรุปสมรรถนะ PBL ในภาคเรียน: รายโปรเจกต์ (จำนวนดีเยี่ยม/ผ่าน/ไม่ผ่าน + คะแนนเฉลี่ย 5 ด้าน) และภาพรวม กรองตามชั้น/ห้อง/ครูได้",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน เช่น 2569-1" },
        grade_level: { type: "string", description: "ระดับชั้น เช่น ป.4 (optional)" },
        classroom: { type: "string", description: "ห้องเรียน เช่น KBW หรือ 2 (optional)" },
        teacher_name: { type: "string", description: "ชื่อครูผู้รับผิดชอบ (optional)" }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_pbl_class_profile",
    description: "โปรไฟล์สมรรถนะ PBL ของห้องเรียน: คะแนนเฉลี่ย 5 ด้าน จุดแข็ง/จุดที่ควรพัฒนา และการกระจายผล (ดีเยี่ยม/ผ่าน/ไม่ผ่าน)",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน" },
        grade_level: { type: "string", description: "ระดับชั้น เช่น ป.4" },
        classroom: { type: "string", description: "ห้องเรียน เช่น KBW หรือ 2" }
      },
      required: ["term", "grade_level", "classroom"]
    }
  },
  {
    name: "atlas_pbl_failing",
    description: "รายชื่อนักเรียนที่ไม่ผ่านเกณฑ์ PBL (มีด้านใดได้ 1) พร้อมด้านที่อ่อนและหมายเหตุ — สำหรับติดตาม/แจ้งเตือน/ช่วยเหลือ",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน" },
        grade_level: { type: "string", description: "ระดับชั้น (optional)" },
        classroom: { type: "string", description: "ห้องเรียน (optional)" },
        teacher_name: { type: "string", description: "ชื่อครู (optional)" }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_pbl_student",
    description: "พัฒนาการสมรรถนะ PBL ของนักเรียนรายคน: คะแนน 5 ด้านในแต่ละโปรเจกต์/หน่วยของภาคเรียน",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน" },
        student_id: { type: "string", description: "รหัสนักเรียน" }
      },
      required: ["term", "student_id"]
    }
  },
  {
    name: "atlas_pbl_unit_crosscheck",
    description: "เชื่อมคะแนน PBL (สมรรถนะข้ามวิชา) กับคะแนนหลังหน่วย K/P/A (สมรรถนะรายวิชา) รายคน — แยกวิเคราะห์ทีละห้อง ไม่เทียบข้ามชั้น คืนช่องว่าง (หน่วย%−PBL%) + กลุ่ม pattern (รู้เนื้อหาแต่ประยุกต์อ่อน / ทำ PBL ได้แต่เนื้อหาอ่อน / เร่งด่วนอ่อนทั้งคู่ / สมดุล) + สรุปรายห้อง + sample_note เตือนปริมาณข้อมูล",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน เช่น 2569-1" },
        grade_level: { type: "string", description: "ระดับชั้น เช่น ป.3 (optional)" },
        classroom: { type: "string", description: "ห้องเรียน เช่น KBW หรือ 2 (optional)" }
      },
      required: ["term"]
    }
  },
  {
    name: "atlas_teaching_logs_by_teacher",
    description: "บันทึกหลังสอนรายครู (drill-down) — กรองตามครู (ชื่อหรือ teacher_id) + ภาคเรียน + ช่วงวันที่ เรียงวันที่ล่าสุดก่อน. ค่าเริ่มต้นไม่รวม Special Care; ถ้าต้องการดูภาระงานจริงทั้งหมดให้ตั้ง include_special_care = true",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน เช่น 2569-1" },
        teacher_name: { type: "string", description: "ชื่อครู (ค้นแบบ ILIKE บางส่วนได้) (optional)" },
        teacher_id: { type: "string", description: "teacher_id (uuid) (optional)" },
        date_from: { type: "string", description: "วันที่เริ่ม YYYY-MM-DD (optional)" },
        date_to: { type: "string", description: "วันที่สิ้นสุด YYYY-MM-DD (optional)" },
        include_special_care: { type: "boolean", description: "true = รวมบันทึก Special Care ด้วย (default false)" },
        limit: { type: "number", description: "จำนวนบันทึกสูงสุด (default 100)" }
      },
      required: ["term"]
    }
  },
  {
    name: "update_action_item",
    description: "[WRITE] อัปเดตสถานะ/หมายเหตุการแก้ปัญหาของ action item หลายรายการพร้อมกัน (UPDATE action_plan_items SET status, resolution_note WHERE id IN ids)",
    inputSchema: {
      type: "object",
      properties: {
        ids: { type: "array", items: { type: "number" }, description: "รายการ id ของ action_plan_items ที่จะอัปเดต" },
        status: { type: "string", description: "สถานะใหม่: open | watching | resolved | verified | dismissed (optional)" },
        resolution_note: { type: "string", description: "หมายเหตุการแก้ปัญหา (optional)" }
      },
      required: ["ids"]
    }
  },
  {
    name: "record_nidet_visit",
    description: "[WRITE] บันทึกการนิเทศ (nidet visit) หนึ่งรายการต่อ action_item_id ที่ระบุ (INSERT INTO nidet_visits)",
    inputSchema: {
      type: "object",
      properties: {
        action_item_ids: { type: "array", items: { type: "number" }, description: "รายการ action_item_id ที่จะบันทึกการนิเทศ" },
        visit_date: { type: "string", description: "วันที่นิเทศ YYYY-MM-DD" },
        visitor_name: { type: "string", description: "ชื่อผู้นิเทศ" },
        note: { type: "string", description: "หมายเหตุการนิเทศ (optional)" }
      },
      required: ["action_item_ids", "visit_date", "visitor_name"]
    }
  },
  {
    name: "update_plc_session",
    description: "[WRITE] อัปเดต next_plc_date / outcome_type ของ PLC session (UPDATE plc_sessions) — ระบุด้วย session_id หรือ session_date",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "number", description: "id ของ plc_sessions (optional ถ้าใช้ session_date)" },
        session_date: { type: "string", description: "วันที่ session YYYY-MM-DD (optional ถ้าใช้ session_id)" },
        next_plc_date: { type: "string", description: "วันนัด PLC ครั้งถัดไป YYYY-MM-DD (optional)" },
        outcome_type: { type: "string", description: "ผลลัพธ์: resolved | need_supervision | continue_plc (optional)" }
      },
      required: []
    }
  }
];

const PAGE_SIZE = 1000;

async function fetchAllTeachingLogs(
  supabase: any,
  columns: string,
  configure: (query: any) => any = (query) => query,
  scope: "non_special_care" | "special_care" | "all" = "non_special_care",
): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from("teaching_logs")
      .select(columns)
      .order("id", { ascending: true });
    if (scope === "special_care") {
      query = query.eq("health_care_status", true);
    } else if (scope === "non_special_care") {
      query = query.or("health_care_status.is.false,health_care_status.is.null");
    }
    query = configure(query).range(from, from + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchAllRows<T = any>(
  build: (from: number, to: number) => any,
  label = "rows",
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows: T[] = data || [];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    if (out.length >= 500_000) {
      console.warn(`fetchAllRows(${label}) hit hard cap`);
      break;
    }
  }
  return out;
}

async function countExcludedSpecialCare(supabase: any, term: string): Promise<number> {
  const { count, error } = await supabase
    .from("teaching_logs")
    .select("id", { count: "exact", head: true })
    .eq("academic_term", term)
    .eq("health_care_status", true);
  if (error) throw error;
  return count ?? 0;
}

const avgOf = (arr: number[]) =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

async function callTool(supabase: any, name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case "atlas_list_terms": {
        const [includedRows, excludedRows] = await Promise.all([
          fetchAllTeachingLogs(supabase, "academic_term"),
          fetchAllTeachingLogs(supabase, "academic_term", (query) => query, "special_care"),
        ]);
        const includedCounts: Record<string, number> = {};
        const excludedCounts: Record<string, number> = {};
        for (const row of includedRows) {
          includedCounts[row.academic_term] = (includedCounts[row.academic_term] || 0) + 1;
        }
        for (const row of excludedRows) {
          excludedCounts[row.academic_term] = (excludedCounts[row.academic_term] || 0) + 1;
        }
        const terms = new Set([...Object.keys(includedCounts), ...Object.keys(excludedCounts)]);
        const result = Array.from(terms)
          .sort((a, b) => b.localeCompare(a))
          .map((term) => ({
            term,
            included_log_count: includedCounts[term] || 0,
            excluded_special_care_count: excludedCounts[term] || 0,
            total_log_count: (includedCounts[term] || 0) + (excludedCounts[term] || 0),
          }));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_classroom_kpi": {
        const [data, scData] = await Promise.all([
          fetchAllTeachingLogs(
            supabase,
            "classroom, grade_level, subject, mastery_score, major_gap, teacher_name",
            (query) => query.eq("academic_term", args.term),
          ),
          fetchAllTeachingLogs(
            supabase,
            "classroom, grade_level, teacher_name",
            (query) => query.eq("academic_term", args.term),
            "special_care",
          ),
        ]);
        const classrooms: Record<string, any> = {};
        const ensureClass = (grade_level: string, classroom: string) => {
          const key = `${grade_level}-${classroom}`;
          if (!classrooms[key]) {
            classrooms[key] = { grade_level, classroom, scores: [], gaps: {}, teachers: new Set(), log_count: 0, sc_count: 0 };
          }
          return classrooms[key];
        };
        for (const row of data) {
          const c = ensureClass(row.grade_level, row.classroom);
          c.scores.push(row.mastery_score || 0);
          c.gaps[row.major_gap] = (c.gaps[row.major_gap] || 0) + 1;
          if (row.teacher_name) c.teachers.add(row.teacher_name);
          c.log_count++;
        }
        for (const row of scData) {
          const c = ensureClass(row.grade_level, row.classroom);
          if (row.teacher_name) c.teachers.add(row.teacher_name);
          c.sc_count++;
        }
        const result = Object.values(classrooms).map((c: any) => ({
          grade_level: c.grade_level,
          classroom: c.classroom,
          logs_total: c.log_count + c.sc_count,
          logs_in_kpi: c.log_count,
          logs_special_care: c.sc_count,
          log_count: c.log_count,
          avg_mastery_score: avgOf(c.scores),
          gap_distribution: c.gaps,
          teachers: Array.from(c.teachers)
        })).sort((a: any, b: any) => b.logs_total - a.logs_total);
        return { content: [{ type: "text", text: JSON.stringify({
          term: args.term,
          term_filter_applied: true,
          note: "avg_mastery_score และ gap_distribution คำนวณจาก logs_in_kpi เท่านั้น (ไม่รวม Special Care ตาม Compassion Protocol) — ใช้ logs_total เมื่อต้องการดูภาระงานจริง",
          included_log_count: data.length,
          excluded_special_care_count: scData.length,
          classrooms: result,
        }, null, 2) }] };
      }

      case "atlas_gap_distribution": {
        const data = await fetchAllTeachingLogs(
          supabase,
          "major_gap",
          (query) => query.eq("academic_term", args.term),
        );
        const excludedSpecialCareCount = await countExcludedSpecialCare(supabase, args.term);
        const gaps: Record<string, number> = {};
        for (const row of data) {
          gaps[row.major_gap] = (gaps[row.major_gap] || 0) + 1;
        }
        const total = data.length;
        const result = Object.entries(gaps)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([gap_type, count]) => ({ gap_type, count, percentage: Math.round((((count as number) / total) * 100) * 10) / 10 }));
        return { content: [{ type: "text", text: JSON.stringify({
          term: args.term,
          term_filter_applied: true,
          included_log_count: total,
          excluded_special_care_count: excludedSpecialCareCount,
          distribution: result,
        }, null, 2) }] };
      }

      case "atlas_key_issues": {
        const limit = args.limit || 10;
        const data = await fetchAllTeachingLogs(
          supabase,
          "key_issue",
          (query) => query
            .eq("academic_term", args.term)
            .not("key_issue", "is", null)
            .neq("key_issue", ""),
        );
        const excludedSpecialCareCount = await countExcludedSpecialCare(supabase, args.term);
        const issues: Record<string, number> = {};
        for (const row of data) {
          if (row.key_issue) issues[row.key_issue] = (issues[row.key_issue] || 0) + 1;
        }
        const result = Object.entries(issues)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, limit)
          .map(([issue, count]) => ({ issue, count }));
        return { content: [{ type: "text", text: JSON.stringify({
          term: args.term,
          term_filter_applied: true,
          included_log_count: data.length,
          excluded_special_care_count: excludedSpecialCareCount,
          issues: result,
        }, null, 2) }] };
      }

      case "atlas_integrity_flags": {
        const [data, scRows] = await Promise.all([
          fetchAllTeachingLogs(
            supabase,
            "teacher_name, classroom, subject, mastery_score, major_gap, key_issue",
            (query) => query.eq("academic_term", args.term),
          ),
          fetchAllTeachingLogs(
            supabase,
            "teacher_name",
            (query) => query.eq("academic_term", args.term),
            "special_care",
          ),
        ]);
        const excludedSpecialCareCount = scRows.length;
        const flags = [];
        const perfectWithGap = data.filter((r: any) => r.mastery_score === 5 && r.major_gap !== "success");
        if (perfectWithGap.length > 0) {
          flags.push({ flag_type: "max_score_with_gap", description: "คะแนนสูงสุด 5 แต่บันทึก Gap — ควรตรวจสอบ", count: perfectWithGap.length,
            examples: perfectWithGap.slice(0, 3).map((r: any) => ({ teacher: r.teacher_name, classroom: r.classroom, subject: r.subject, score: r.mastery_score, gap: r.major_gap })) });
        }
        const zeroWithSuccess = data.filter((r: any) => r.mastery_score <= 2 && r.major_gap === "success");
        if (zeroWithSuccess.length > 0) {
          flags.push({ flag_type: "minimum_score_with_success", description: "คะแนนต่ำสุด 2 หรือต่ำกว่าแต่บันทึก Success — ควรตรวจสอบ", count: zeroWithSuccess.length,
            examples: zeroWithSuccess.slice(0, 3).map((r: any) => ({ teacher: r.teacher_name, classroom: r.classroom, subject: r.subject })) });
        }
        const gapNoIssue = data.filter((r: any) => r.major_gap !== "success" && (!r.key_issue || r.key_issue.trim() === ""));
        if (gapNoIssue.length > 0) {
          flags.push({ flag_type: "gap_without_key_issue", description: "บันทึก Gap แต่ไม่ระบุปัญหาสำคัญ", count: gapNoIssue.length });
        }

        // FLAG9 — นับเฉพาะบันทึกหลังเส้นฐานการตรวจสอบ (audit baseline)
        // บันทึกก่อน 18 ส.ค. 2569 ผ่านการตรวจสอบและครูยืนยันแล้ว จึงไม่นับซ้ำ
        const [postAll, postSc] = await Promise.all([
          fetchAllTeachingLogs(
            supabase, "teacher_name",
            (q) => q.eq("academic_term", args.term).gt("teaching_date", FLAG9_BASELINE),
          ),
          fetchAllTeachingLogs(
            supabase, "teacher_name",
            (q) => q.eq("academic_term", args.term).gt("teaching_date", FLAG9_BASELINE),
            "special_care",
          ),
        ]);
        const perTeacher: Record<string, { in_kpi: number; sc: number }> = {};
        for (const r of postAll) {
          const t = r.teacher_name || "ไม่ระบุ";
          (perTeacher[t] ||= { in_kpi: 0, sc: 0 }).in_kpi++;
        }
        for (const r of postSc) {
          const t = r.teacher_name || "ไม่ระบุ";
          (perTeacher[t] ||= { in_kpi: 0, sc: 0 }).sc++;
        }
        const flag9 = Object.entries(perTeacher)
          .map(([teacher, v]) => {
            const total = v.in_kpi + v.sc;
            return { teacher, logs_after_baseline: total, logs_special_care: v.sc, percent: total > 0 ? Math.round((v.sc / total) * 1000) / 10 : 0 };
          })
          .filter((t) => t.logs_after_baseline >= 10 && t.percent >= 30)
          .sort((a, b) => b.percent - a.percent);
        if (flag9.length > 0) {
          flags.push({
            flag_type: "special_care_overuse",
            flag_code: "FLAG9",
            audit_baseline: FLAG9_BASELINE,
            description: "สัดส่วนบันทึก Special Care สูงผิดปกติหลังวันปรับนิยาม (18 ส.ค. 2569) — อาจติ๊กช่องผิดความหมาย (ควรติ๊กเมื่อคาบนั้นประเมินเด็ก Special Care เป็นเป้าหมายหลัก ไม่ใช่แค่มีเด็กอยู่ในห้อง) บันทึกก่อนเส้นฐานผ่านการตรวจสอบและครูยืนยันแล้ว",
            count: flag9.length,
            examples: flag9.slice(0, 5)
          });
        }

        const suspicious = perfectWithGap.length + zeroWithSuccess.length;
        return { content: [{ type: "text", text: JSON.stringify({
          term: args.term,
          term_filter_applied: true,
          flag9_audit_baseline: FLAG9_BASELINE,
          included_log_count: data.length,
          excluded_special_care_count: excludedSpecialCareCount,
          integrity_score: Math.round(((data.length - suspicious) / Math.max(data.length, 1)) * 100),
          flags,
        }, null, 2) }] };
      }

      case "atlas_teacher_list": {
        const [data, scData] = await Promise.all([
          fetchAllTeachingLogs(
            supabase,
            "teacher_name, classroom, subject, mastery_score, major_gap",
            (query) => query.eq("academic_term", args.term),
          ),
          fetchAllTeachingLogs(
            supabase,
            "teacher_name",
            (query) => query.eq("academic_term", args.term),
            "special_care",
          ),
        ]);
        const teachers: Record<string, any> = {};
        const ensureTeacher = (t: string) => {
          if (!teachers[t]) teachers[t] = { teacher_name: t, in_kpi: 0, sc: 0, scores: [], gaps: {} };
          return teachers[t];
        };
        for (const row of data) {
          const t = ensureTeacher(row.teacher_name || "ไม่ระบุ");
          t.in_kpi++;
          t.scores.push(row.mastery_score || 0);
          t.gaps[row.major_gap] = (t.gaps[row.major_gap] || 0) + 1;
        }
        for (const row of scData) {
          ensureTeacher(row.teacher_name || "ไม่ระบุ").sc++;
        }
        const result = Object.values(teachers).map((t: any) => {
          const total = t.in_kpi + t.sc;
          return {
            teacher_name: t.teacher_name,
            logs_total: total,
            logs_in_kpi: t.in_kpi,
            logs_special_care: t.sc,
            special_care_percent: total > 0 ? Math.round((t.sc / total) * 1000) / 10 : 0,
            log_count: t.in_kpi,
            avg_mastery_score: avgOf(t.scores),
            success_rate: t.in_kpi > 0 ? Math.round(((t.gaps["success"] || 0) / t.in_kpi) * 100) : null,
            health_care_count: t.sc,
            gap_distribution: t.gaps
          };
        }).sort((a: any, b: any) => b.logs_total - a.logs_total);
        return { content: [{ type: "text", text: JSON.stringify({
          term: args.term,
          term_filter_applied: true,
          note: "logs_total = ภาระงานจริง (ใช้วัด compliance) | logs_in_kpi = ฐานคำนวณคุณภาพ ไม่รวม Special Care | avg_mastery_score, success_rate, gap_distribution คำนวณจาก logs_in_kpi เท่านั้น — ห้ามใช้ logs_in_kpi ตัดสินว่าครูกรอกน้อย",
          included_log_count: data.length,
          excluded_special_care_count: scData.length,
          teachers: result,
        }, null, 2) }] };
      }

      case "atlas_red_zone": {
        const threshold = args.threshold ?? 3.0;
        const data = await fetchAllTeachingLogs(
          supabase,
          "teacher_name, grade_level, classroom, mastery_score, major_gap",
          (query) => query.eq("academic_term", args.term),
        );
        const excludedSpecialCareCount = await countExcludedSpecialCare(supabase, args.term);
        const classrooms: Record<string, any> = {};
        for (const row of data) {
          const key = `${row.grade_level}-${row.classroom}`;
          if (!classrooms[key]) classrooms[key] = { grade_level: row.grade_level, classroom: row.classroom, scores: [], gap_count: 0, total: 0 };
          classrooms[key].scores.push(row.mastery_score || 0);
          classrooms[key].total++;
          if (row.major_gap !== "success") classrooms[key].gap_count++;
        }
        const result = Object.values(classrooms)
          .map((c: any) => ({
            grade_level: c.grade_level,
            classroom: c.classroom,
            avg_score: avgOf(c.scores),
            gap_rate: Math.round((c.gap_count / c.total) * 100),
            log_count: c.total
          }))
          .filter((c: any) => c.avg_score !== null && c.avg_score < threshold)
          .sort((a: any, b: any) => (a.avg_score as number) - (b.avg_score as number));
        return { content: [{ type: "text", text: JSON.stringify({
          term: args.term,
          term_filter_applied: true,
          score_scale_observed: "2–5",
          threshold,
          included_log_count: data.length,
          excluded_special_care_count: excludedSpecialCareCount,
          classrooms: result,
        }, null, 2) }] };
      }

      case "atlas_plc_sessions": {
        const data = await fetchAllRows((from, to) => {
          let query = supabase
            .from("plc_sessions")
            .select("id, session_date, topic, plc_type, grade_band, subject, facilitator_name, members, outcome_type, linked_action_item_ids, next_plc_date, problem_statement, approach");
          if (args.date_from) query = query.gte("session_date", args.date_from);
          if (args.date_to) query = query.lte("session_date", args.date_to);
          if (args.outcome_type) query = query.eq("outcome_type", args.outcome_type);
          return query.order("session_date", { ascending: false }).order("id").range(from, to);
        }, "plc_sessions");
        const summary = {
          total_sessions: data.length,
          outcomes: data.reduce((acc: any, s: any) => {
            acc[s.outcome_type] = (acc[s.outcome_type] || 0) + 1;
            return acc;
          }, {}),
          sessions: data.map((s: any) => ({
            session_date: s.session_date,
            topic: s.topic,
            plc_type: s.plc_type,
            grade_band: s.grade_band,
            subject: s.subject,
            facilitator: s.facilitator_name,
            member_count: Array.isArray(s.members) ? s.members.length : 0,
            outcome: s.outcome_type,
            covered_items: Array.isArray(s.linked_action_item_ids) ? s.linked_action_item_ids.length : 0,
            next_plc_date: s.next_plc_date
          }))
        };
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      }

      case "atlas_action_items": {
        const data = await fetchAllRows((from, to) => {
          let query = supabase
            .from("action_plan_items")
            .select("id, issue_type, severity, status, grade_level, classroom, subject, teacher_name, teacher_id, metric_value, auto_resolved, resolution_note, created_at");
          if (args.status) query = query.eq("status", args.status);
          if (args.teacher_id) query = query.eq("teacher_id", args.teacher_id);
          return query.order("created_at", { ascending: false }).order("id").range(from, to);
        }, "action_plan_items");

        const itemIds = data.map((i: any) => i.id);
        const plcLinks = await fetchAllRows((from, to) => supabase
          .from("plc_sessions")
          .select("linked_action_item_ids")
          .order("id")
          .range(from, to), "plc_sessions");
        const itemsInPlc = new Set<number>();
        for (const p of plcLinks || []) {
          for (const id of p.linked_action_item_ids || []) itemsInPlc.add(id);
        }
        const { data: nidetLinks } = await supabase
          .from("nidet_visits")
          .select("action_item_id")
          .in("action_item_id", itemIds);
        const itemsInNidet = new Set((nidetLinks || []).map((n: any) => n.action_item_id));

        const result = data.map((i: any) => ({
          id: i.id,
          issue_type: i.issue_type,
          severity: i.severity,
          status: i.status,
          grade_level: i.grade_level,
          classroom: i.classroom,
          subject: i.subject,
          teacher_name: i.teacher_name,
          metric_value: i.metric_value,
          has_plc: itemsInPlc.has(i.id),
          has_nidet: itemsInNidet.has(i.id),
          auto_resolved: i.auto_resolved,
          resolution_note: i.resolution_note
        }));
        const suspendedNotices = suspensionNoticesFor(result.map((i: any) => i.issue_type));
        const summary = {
          total: result.length,
          by_status: result.reduce((acc: any, i: any) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {}),
          items_with_plc: result.filter((i: any) => i.has_plc).length,
          items_with_nidet: result.filter((i: any) => i.has_nidet).length,
          items_untouched: result.filter((i: any) => !i.has_plc && !i.has_nidet && (i.status === "open" || i.status === "watching") && !isSuspendedIssueType(i.issue_type)).length,
          ...(suspendedNotices.length > 0 && {
            suspended_issue_types: suspendedNotices,
            suspended_note: "items_untouched ไม่รวมประเภทที่ระงับแล้ว; total และ by_status ยังรวมทุกประเภท",
          }),
          items: result
        };
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      }

      case "atlas_wf6_candidate_audit": {
        if (typeof args.term !== "string" || !args.term.trim()) {
          return { content: [{ type: "text", text: "Error: ต้องระบุ term" }], isError: true };
        }
        const canonicalTerm = normalizeAcademicTerm(args.term);
        if (!/^\d{4}-\d+$/.test(canonicalTerm)) {
          return { content: [{ type: "text", text: "Error: term ต้องอยู่ในรูป 2569-1 หรือ 1/2569" }], isError: true };
        }
        const [year, semester] = canonicalTerm.split("-");
        const termVariants = [...new Set([canonicalTerm, `${semester}/${year}`])];
        const asOfDate = typeof args.as_of_date === "string" && args.as_of_date
          ? args.as_of_date
          : bangkokCalendarDate(new Date());
        if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
          return { content: [{ type: "text", text: "Error: as_of_date ต้องอยู่ในรูป YYYY-MM-DD" }], isError: true };
        }

        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const assessments = await fetchAllRows<Wf6AssessmentRow>((from, to) => {
          let query = admin.from("unit_assessments")
            .select("id,student_id,student_name,academic_term,assessed_date,created_at,score,total_score,grade_level,classroom,subject,unit_name,teacher_id")
            .in("academic_term", termVariants);
          if (args.grade_level) query = query.eq("grade_level", args.grade_level);
          if (args.classroom) query = query.eq("classroom", args.classroom);
          if (args.subject) query = query.eq("subject", args.subject);
          return query.order("id", { ascending: true }).range(from, to);
        }, "wf6_unit_assessments");

        const teachingLogs = await fetchAllRows<Wf6TeachingLogRow>((from, to) => {
          let query = admin.from("teaching_logs")
            .select("academic_term,teaching_date,grade_level,classroom,subject,remedial_ids,health_care_status")
            .in("academic_term", termVariants);
          if (args.grade_level) query = query.eq("grade_level", args.grade_level);
          if (args.classroom) query = query.eq("classroom", args.classroom);
          if (args.subject) query = query.eq("subject", args.subject);
          return query.order("id", { ascending: true }).range(from, to);
        }, "wf6_teaching_logs");

        const actionItems = await fetchAllRows<Wf6ActionItemRow>((from, to) => admin.from("action_plan_items")
          .select("issue_type,issue_key,subject,grade_level,classroom,created_at,evidence_context")
          .eq("issue_type", "UnitBlindSpot")
          .order("id", { ascending: true })
          .range(from, to), "wf6_action_items");

        const teacherIds = [...new Set(assessments
          .map((row) => row.teacher_id)
          .filter((teacherId): teacherId is string => Boolean(teacherId)))];
        let profiles: Wf6ProfileRow[] = [];
        if (teacherIds.length) {
          const { data, error } = await admin.from("profiles")
            .select("user_id,full_name")
            .in("user_id", teacherIds);
          if (error) throw error;
          profiles = data || [];
        }

        const candidates = evaluateWf6Candidates({
          term: canonicalTerm,
          asOfDate,
          assessments,
          teachingLogs,
          actionItems,
          profiles,
        });
        const summary = summarizeWf6Candidates(candidates, {
          term: canonicalTerm,
          asOfDate,
          includeDetails: args.include_details === true,
          limit: Number(args.limit) || 20,
        });
        const suspension = buildSuspensionNotice("UnitBlindSpot");
        return { content: [{ type: "text", text: JSON.stringify({
          ...(suspension && {
            rule_status: suspension.rule_status,
            suspended_since: suspension.suspended_since,
            notice: suspension.notice,
          }),
          ...summary,
          source_counts: {
            unit_assessments: assessments.length,
            teaching_logs: teachingLogs.length,
            unit_blind_spot_action_items: actionItems.length,
          },
          note: "ผลเป็น audit ตามกติกา WF-6 และไม่รวมการประเมินที่มีหลักฐานช่วยเหลือหรือมี Action Item เดิมแล้ว",
        }, null, 2) }] };
      }

      case "atlas_plc_effectiveness": {
        const sessions = await fetchAllRows((from, to) => {
          let plcQuery = supabase.from("plc_sessions").select("*");
          if (args.date_from) plcQuery = plcQuery.gte("session_date", args.date_from);
          if (args.date_to) plcQuery = plcQuery.lte("session_date", args.date_to);
          if (args.plc_type && args.plc_type !== "all") plcQuery = plcQuery.eq("plc_type", args.plc_type);
          return plcQuery.order("id").range(from, to);
        }, "plc_sessions");

        if (!sessions || sessions.length === 0) {
          return { content: [{ type: "text", text: JSON.stringify({ message: "ไม่มี PLC sessions ในช่วงเวลาที่กำหนด" }, null, 2) }] };
        }

        const allLinkedItemIds = new Set<number>();
        for (const s of sessions) {
          if (Array.isArray(s.linked_action_item_ids)) {
            for (const id of s.linked_action_item_ids) allLinkedItemIds.add(id);
          }
        }

        const actionItems = await fetchAllRows((from, to) => {
          let actionItemsQuery = supabase.from("action_plan_items").select("*");
          if (allLinkedItemIds.size > 0) {
            actionItemsQuery = actionItemsQuery.in("id", Array.from(allLinkedItemIds));
          }
          if (args.teacher_id) actionItemsQuery = actionItemsQuery.eq("teacher_id", args.teacher_id);
          return actionItemsQuery.order("id").range(from, to);
        }, "action_plan_items");

        const itemMap = new Map((actionItems || []).map((i: any) => [i.id, i]));
        const resolvedCount = (actionItems || []).filter((i: any) => i.status === "resolved" || i.status === "verified").length;
        const totalItems = allLinkedItemIds.size;

        const outcomeDistribution = sessions.reduce((acc: any, s: any) => {
          acc[s.outcome_type] = (acc[s.outcome_type] || 0) + 1;
          return acc;
        }, {});

        const avgDaysToResolve = (() => {
          const resolved = sessions.filter((s: any) => s.outcome_type === "resolved");
          if (resolved.length === 0) return null;
          let totalDays = 0;
          let count = 0;
          for (const s of resolved) {
            for (const itemId of s.linked_action_item_ids || []) {
              const item = itemMap.get(itemId);
              if (item && item.created_at) {
                const created = new Date(item.created_at);
                const sessionDate = new Date(s.session_date);
                const days = Math.round((sessionDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                if (days >= 0) {
                  totalDays += days;
                  count++;
                }
              }
            }
          }
          return count > 0 ? Math.round(totalDays / count) : null;
        })();

        const result = {
          total_sessions: sessions.length,
          total_items_covered: totalItems,
          items_resolved: resolvedCount,
          resolution_rate_percent: totalItems > 0 ? Math.round((resolvedCount / totalItems) * 100) : 0,
          outcome_distribution: outcomeDistribution,
          avg_days_to_resolve: avgDaysToResolve,
          sessions_by_type: sessions.reduce((acc: any, s: any) => {
            acc[s.plc_type] = (acc[s.plc_type] || 0) + 1;
            return acc;
          }, {})
        };
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_plc_coverage_gap": {
        const openItems = await fetchAllRows((from, to) => supabase
          .from("action_plan_items")
          .select("*")
          .in("status", ["open", "watching"])
          .order("id")
          .range(from, to), "action_plan_items");

        const plcSessions = await fetchAllRows((from, to) => supabase
          .from("plc_sessions")
          .select("linked_action_item_ids")
          .order("id")
          .range(from, to), "plc_sessions");
        const coveredIds = new Set<number>();
        for (const p of plcSessions || []) {
          for (const id of p.linked_action_item_ids || []) coveredIds.add(id);
        }

        let uncovered = (openItems || []).filter((i: any) => !coveredIds.has(i.id));
        if (args.severity_filter && args.severity_filter !== "all") {
          uncovered = uncovered.filter((i: any) => i.severity === args.severity_filter);
        }

        const totalOpen = (openItems || []).length;
        const uncoveredCount = uncovered.length;

        const result = {
          total_open_items: totalOpen,
          items_covered_by_plc: totalOpen - uncoveredCount,
          items_without_plc: uncoveredCount,
          coverage_percent: totalOpen > 0 ? Math.round(((totalOpen - uncoveredCount) / totalOpen) * 100) : 0,
          uncovered_items: uncovered.map((i: any) => ({
            id: i.id,
            teacher_name: i.teacher_name,
            subject: i.subject,
            grade_level: i.grade_level,
            classroom: i.classroom,
            severity: i.severity,
            issue_type: i.issue_type,
            days_open: Math.round((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24))
          })).sort((a: any, b: any) => b.days_open - a.days_open)
        };
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_plc_timeline": {
        const sessions = await fetchAllRows((from, to) => {
          let query = supabase.from("plc_sessions").select("*");
          if (args.date_from) query = query.gte("session_date", args.date_from);
          if (args.date_to) query = query.lte("session_date", args.date_to);
          return query.order("session_date", { ascending: true }).order("id").range(from, to);
        }, "plc_sessions");

        const chains: any[] = [];
        const processed = new Set<string>();

        for (const s of sessions || []) {
          if (processed.has(s.id)) continue;

          const chain = [s];
          processed.add(s.id);

          let nextDate = s.next_plc_date;
          while (nextDate) {
            const nextSession = sessions.find((x: any) => !processed.has(x.id) && x.session_date === nextDate && x.topic === s.topic);
            if (!nextSession) break;
            chain.push(nextSession);
            processed.add(nextSession.id);
            nextDate = nextSession.next_plc_date;
          }

          if (chain.length > 1 || s.outcome_type !== "continue_plc") {
            const firstDate = new Date(chain[0].session_date);
            const lastDate = new Date(chain[chain.length - 1].session_date);
            const daysToResolve = chain[chain.length - 1].outcome_type === "resolved" ? Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) : null;

            chains.push({
              initial_session_date: chain[0].session_date,
              topic: s.topic,
              plc_type: s.plc_type,
              facilitator: s.facilitator_name,
              chain: chain.map((c: any) => ({
                session_date: c.session_date,
                outcome: c.outcome_type,
                next_plc_date: c.next_plc_date,
                covered_items: Array.isArray(c.linked_action_item_ids) ? c.linked_action_item_ids.length : 0
              })),
              total_sessions: chain.length,
              days_to_resolve: daysToResolve,
              final_outcome: chain[chain.length - 1].outcome_type
            });
          }
        }

        const result = {
          total_chains: chains.length,
          plc_chains: chains.sort((a, b) => b.total_sessions - a.total_sessions)
        };
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_cross_plc_opportunities": {
        const minOverlap = args.min_overlap || 2;
        const openItems = await fetchAllRows((from, to) => supabase
          .from("action_plan_items")
          .select("*")
          .in("status", ["open", "watching"])
          .order("id")
          .range(from, to), "action_plan_items");

        const items = openItems || [];

        const keyIssueMap: Record<string, any[]> = {};
        for (const item of items) {
          const key = (item.detail || "").trim().toLowerCase();
          if (key && key.length > 10) {
            if (!keyIssueMap[key]) keyIssueMap[key] = [];
            keyIssueMap[key].push(item);
          }
        }

        const crossSubjectOpportunities = Object.entries(keyIssueMap)
          .filter(([, items]) => items.length >= minOverlap)
          .map(([issue, items]) => {
            const subjects = new Set(items.map((i: any) => i.subject).filter(Boolean));
            const grades = new Set(items.map((i: any) => i.grade_level).filter(Boolean));
            const teachers = new Set(items.map((i: any) => i.teacher_name).filter(Boolean));
            return {
              issue_summary: issue.slice(0, 100),
              item_count: items.length,
              subjects: Array.from(subjects),
              grade_levels: Array.from(grades),
              teachers: Array.from(teachers),
              is_cross_subject: subjects.size > 1,
              is_cross_grade: grades.size > 1,
              item_ids: items.map((i: any) => i.id)
            };
          })
          .filter((opp: any) => opp.is_cross_subject || opp.is_cross_grade)
          .sort((a: any, b: any) => b.item_count - a.item_count);

        const teacherItemMap: Record<string, any[]> = {};
        for (const item of items) {
          if (item.teacher_name) {
            if (!teacherItemMap[item.teacher_name]) teacherItemMap[item.teacher_name] = [];
            teacherItemMap[item.teacher_name].push(item);
          }
        }

        const teacherOpportunities = Object.entries(teacherItemMap)
          .filter(([, items]) => items.length >= minOverlap)
          .map(([teacher, items]) => {
            const subjects = new Set(items.map((i: any) => i.subject).filter(Boolean));
            return {
              teacher_name: teacher,
              item_count: items.length,
              subjects: Array.from(subjects),
              is_multi_subject: subjects.size > 1,
              item_ids: items.map((i: any) => i.id)
            };
          })
          .filter((opp: any) => opp.is_multi_subject)
          .sort((a: any, b: any) => b.item_count - a.item_count);

        const result = {
          cross_subject_opportunities: crossSubjectOpportunities,
          teacher_multi_subject_opportunities: teacherOpportunities,
          summary: {
            total_cross_opportunities: crossSubjectOpportunities.length,
            total_teacher_opportunities: teacherOpportunities.length
          }
        };
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_plc_recommendations": {
        const maxPlans = args.max_plans || 3;
        const minCoverage = args.min_coverage_percent || 30;

        const openItems = await fetchAllRows((from, to) => supabase
          .from("action_plan_items")
          .select("*")
          .in("status", ["open", "watching"])
          .order("id")
          .range(from, to), "action_plan_items");

        if (!openItems || openItems.length === 0) {
          return { content: [{ type: "text", text: JSON.stringify({ plans: [], message: "ไม่มี open items ในระบบ" }, null, 2) }] };
        }

        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name");
        const teacherMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));

        const plans: any[] = [];

        if (!args.prefer_type || args.prefer_type === "subject") {
          const subjectMap: Record<string, any[]> = {};
          for (const item of openItems) {
            if (item.subject) {
              if (!subjectMap[item.subject]) subjectMap[item.subject] = [];
              subjectMap[item.subject].push(item);
            }
          }
          for (const [subject, items] of Object.entries(subjectMap)) {
            const coverage = (items.length / openItems.length) * 100;
            if (coverage >= minCoverage) {
              const teachers = new Set(items.map((i: any) => i.teacher_id).filter(Boolean));
              plans.push({
                plan_name: `PLC วิชา${subject}`,
                topic: `แก้ปัญหาการสอนวิชา${subject}`,
                plc_type: "subject",
                subject,
                covered_item_ids: items.map((i: any) => i.id),
                coverage_percent: Math.round(coverage),
                members: Array.from(teachers).map((tid: any) => ({ teacher_id: tid, teacher_name: teacherMap.get(tid) || "ไม่ระบุ" })),
                rationale: `รวมปัญหาวิชา${subject} จำนวน ${items.length} รายการ`,
                problem_statement: `นักเรียนมีปัญหาในวิชา${subject}`,
                root_cause: "ต้องวิเคราะห์เพิ่มเติมใน PLC",
                approach: "ครูร่วมกันหาวิธีสอนที่เหมาะสม"
              });
            }
          }
        }

        if (!args.prefer_type || args.prefer_type === "grade_band") {
          const gradeBandMap: Record<string, any[]> = { "ป.1-3": [], "ป.4-6": [] };
          for (const item of openItems) {
            const gl = item.grade_level || "";
            if (gl.match(/ป\.[1-3]/)) gradeBandMap["ป.1-3"].push(item);
            else if (gl.match(/ป\.[4-6]/)) gradeBandMap["ป.4-6"].push(item);
          }
          for (const [band, items] of Object.entries(gradeBandMap)) {
            if (items.length === 0) continue;
            const coverage = (items.length / openItems.length) * 100;
            if (coverage >= minCoverage) {
              const teachers = new Set(items.map((i: any) => i.teacher_id).filter(Boolean));
              plans.push({
                plan_name: `PLC ช่วงชั้น${band}`,
                topic: `แก้ปัญหาช่วงชั้น${band}`,
                plc_type: "grade_band",
                grade_band: band,
                covered_item_ids: items.map((i: any) => i.id),
                coverage_percent: Math.round(coverage),
                members: Array.from(teachers).map((tid: any) => ({ teacher_id: tid, teacher_name: teacherMap.get(tid) || "ไม่ระบุ" })),
                rationale: `รวมปัญหาช่วงชั้น${band} จำนวน ${items.length} รายการ`,
                problem_statement: `นักเรียนช่วงชั้น${band} มีปัญหาหลายด้าน`,
                root_cause: "ต้องวิเคราะห์เพิ่มเติมใน PLC",
                approach: "ครูช่วงชั้นร่วมกันแก้ปัญหา"
              });
            }
          }
        }

        if (!args.prefer_type || args.prefer_type === "cross") {
          const teachers = new Set(openItems.map((i: any) => i.teacher_id).filter(Boolean));
          plans.push({
            plan_name: "PLC ทั้งโรงเรียน",
            topic: "แก้ปัญหาทั่วทั้งโรงเรียน",
            plc_type: "cross",
            grade_band: "ทั้งโรงเรียน",
            covered_item_ids: openItems.map((i: any) => i.id),
            coverage_percent: 100,
            members: Array.from(teachers).map((tid: any) => ({ teacher_id: tid, teacher_name: teacherMap.get(tid) || "ไม่ระบุ" })),
            rationale: `ครอบคลุมทุกปัญหา ${openItems.length} รายการ`,
            problem_statement: "ปัญหาหลากหลายข้ามวิชาและช่วงชั้น",
            root_cause: "ต้องวิเคราะห์เพิ่มเติมใน PLC",
            approach: "ครูทุกคนร่วมกันหาแนวทาง"
          });
        }

        const finalPlans = plans.sort((a, b) => b.coverage_percent - a.coverage_percent).slice(0, maxPlans);
        return { content: [{ type: "text", text: JSON.stringify({ plans: finalPlans, total_plans: finalPlans.length }, null, 2) }] };
      }

      case "atlas_pbl_summary": {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        let pq = admin.from("pbl_projects")
          .select("id, project_name, grade_level, classroom, teacher_name, month")
          .eq("academic_term", args.term);
        if (args.grade_level) pq = pq.eq("grade_level", args.grade_level);
        if (args.classroom) pq = pq.eq("classroom", args.classroom);
        if (args.teacher_name) pq = pq.eq("teacher_name", args.teacher_name);
        const { data: projects, error: pe } = await pq;
        if (pe) throw pe;
        if (!projects || projects.length === 0) {
          return { content: [{ type: "text", text: JSON.stringify({ term: args.term, message: "ไม่พบโปรเจกต์ PBL ตามเงื่อนไข" }, null, 2) }] };
        }
        const ids = projects.map((p: any) => p.id);
        const assess = await fetchAllRows((from, to) => admin.from("pbl_assessments")
          .select("project_id, com_score, think_score, problem_score, life_score, tech_score, overall_result")
          .in("project_id", ids)
          .order("id")
          .range(from, to), "pbl_assessments");
        const rowsAll = assess || [];
        const projectsOut = projects.map((p: any) => {
          const rows = rowsAll.filter((a: any) => a.project_id === p.id);
          const n = rows.length || 1;
          const avg = (k: string) => Math.round((rows.reduce((s: number, a: any) => s + (a[k] || 0), 0) / n) * 100) / 100;
          return {
            project_name: p.project_name, grade_level: p.grade_level, classroom: p.classroom,
            teacher_name: p.teacher_name, month: p.month, students: rows.length,
            excellent: rows.filter((a: any) => a.overall_result === "excellent").length,
            pass: rows.filter((a: any) => a.overall_result === "pass").length,
            fail: rows.filter((a: any) => a.overall_result === "fail").length,
            avg_competency: { communication: avg("com_score"), thinking: avg("think_score"), problem_solving: avg("problem_score"), life_skill: avg("life_score"), technology: avg("tech_score") }
          };
        });
        const overall = {
          total_projects: projects.length, total_assessments: rowsAll.length,
          excellent: rowsAll.filter((a: any) => a.overall_result === "excellent").length,
          pass: rowsAll.filter((a: any) => a.overall_result === "pass").length,
          fail: rowsAll.filter((a: any) => a.overall_result === "fail").length
        };
        return { content: [{ type: "text", text: JSON.stringify({ term: args.term, overall, projects: projectsOut }, null, 2) }] };
      }

      case "atlas_pbl_class_profile": {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: projects, error: pe } = await admin.from("pbl_projects")
          .select("id")
          .eq("academic_term", args.term).eq("grade_level", args.grade_level).eq("classroom", args.classroom);
        if (pe) throw pe;
        const ids = (projects || []).map((p: any) => p.id);
        if (ids.length === 0) {
          return { content: [{ type: "text", text: JSON.stringify({ message: "ไม่พบข้อมูล PBL ของห้องนี้", term: args.term, grade_level: args.grade_level, classroom: args.classroom }, null, 2) }] };
        }
        const { data: assess, error: ae } = await admin.from("pbl_assessments")
          .select("student_id, com_score, think_score, problem_score, life_score, tech_score, overall_result").in("project_id", ids);
        if (ae) throw ae;
        const rows = assess || [];
        const n = rows.length || 1;
        const dims = [
          { key: "com_score", label: "การสื่อสาร" }, { key: "think_score", label: "การคิด" },
          { key: "problem_score", label: "การแก้ปัญหา" }, { key: "life_score", label: "ทักษะชีวิต" },
          { key: "tech_score", label: "เทคโนโลยี" }
        ];
        const avgs = dims.map((d) => ({ dimension: d.label, avg: Math.round((rows.reduce((s: number, a: any) => s + (a[d.key] || 0), 0) / n) * 100) / 100 }));
        const sorted = [...avgs].sort((a, b) => b.avg - a.avg);
        const result = {
          term: args.term, grade_level: args.grade_level, classroom: args.classroom,
          assessments: rows.length, distinct_students: new Set(rows.map((a: any) => a.student_id)).size,
          result_distribution: {
            excellent: rows.filter((a: any) => a.overall_result === "excellent").length,
            pass: rows.filter((a: any) => a.overall_result === "pass").length,
            fail: rows.filter((a: any) => a.overall_result === "fail").length
          },
          competency_avg: avgs,
          strength: sorted[0] || null, weakness: sorted[sorted.length - 1] || null
        };
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_pbl_failing": {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        let pq = admin.from("pbl_projects").select("id, project_name, grade_level, classroom, teacher_name").eq("academic_term", args.term);
        if (args.grade_level) pq = pq.eq("grade_level", args.grade_level);
        if (args.classroom) pq = pq.eq("classroom", args.classroom);
        if (args.teacher_name) pq = pq.eq("teacher_name", args.teacher_name);
        const { data: projects, error: pe } = await pq;
        if (pe) throw pe;
        const pmap: Record<string, any> = {};
        (projects || []).forEach((p: any) => { pmap[p.id] = p; });
        const ids = Object.keys(pmap);
        if (ids.length === 0) return { content: [{ type: "text", text: JSON.stringify({ term: args.term, failing: [], message: "ไม่พบโปรเจกต์ตามเงื่อนไข" }, null, 2) }] };
        const assess = await fetchAllRows((from, to) => admin.from("pbl_assessments")
          .select("student_id, student_name, project_id, com_score, think_score, problem_score, life_score, tech_score, notes")
          .in("project_id", ids).eq("overall_result", "fail")
          .order("id")
          .range(from, to), "pbl_assessments");
        const dimMap: Record<string, string> = { com_score: "การสื่อสาร", think_score: "การคิด", problem_score: "การแก้ปัญหา", life_score: "ทักษะชีวิต", tech_score: "เทคโนโลยี" };
        const failing = (assess || []).map((a: any) => {
          const p = pmap[a.project_id] || {};
          const weak = Object.keys(dimMap).filter((k) => a[k] === 1).map((k) => dimMap[k]);
          return {
            student_id: a.student_id, student_name: a.student_name,
            project_name: p.project_name, grade_level: p.grade_level, classroom: p.classroom, teacher_name: p.teacher_name,
            scores: { communication: a.com_score, thinking: a.think_score, problem_solving: a.problem_score, life_skill: a.life_score, technology: a.tech_score },
            weak_dimensions: weak, notes: a.notes || null
          };
        });
        return { content: [{ type: "text", text: JSON.stringify({ term: args.term, total_failing: failing.length, failing }, null, 2) }] };
      }

      case "atlas_pbl_student": {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: projects, error: pe } = await admin.from("pbl_projects")
          .select("id, project_name, grade_level, classroom, month").eq("academic_term", args.term);
        if (pe) throw pe;
        const pmap: Record<string, any> = {};
        (projects || []).forEach((p: any) => { pmap[p.id] = p; });
        const ids = Object.keys(pmap);
        if (ids.length === 0) return { content: [{ type: "text", text: JSON.stringify({ message: "ไม่พบโปรเจกต์ในภาคเรียนนี้", term: args.term }, null, 2) }] };
        const { data: assess, error: ae } = await admin.from("pbl_assessments")
          .select("student_name, project_id, com_score, think_score, problem_score, life_score, tech_score, overall_result, notes")
          .in("project_id", ids).eq("student_id", args.student_id);
        if (ae) throw ae;
        const rows = assess || [];
        if (rows.length === 0) return { content: [{ type: "text", text: JSON.stringify({ message: "ไม่พบข้อมูล PBL ของนักเรียนรหัสนี้ในภาคเรียนนี้", term: args.term, student_id: args.student_id }, null, 2) }] };
        const projectsOut = rows.map((a: any) => {
          const p = pmap[a.project_id] || {};
          return {
            project_name: p.project_name, grade_level: p.grade_level, classroom: p.classroom, month: p.month,
            scores: { communication: a.com_score, thinking: a.think_score, problem_solving: a.problem_score, life_skill: a.life_score, technology: a.tech_score },
            overall_result: a.overall_result, notes: a.notes || null
          };
        });
        return { content: [{ type: "text", text: JSON.stringify({ term: args.term, student_id: args.student_id, student_name: rows[0].student_name, projects: projectsOut }, null, 2) }] };
      }

      case "atlas_pbl_unit_crosscheck": {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        let pq = admin.from("pbl_projects")
          .select("id, grade_level, classroom")
          .eq("academic_term", args.term);
        if (args.grade_level) pq = pq.eq("grade_level", args.grade_level);
        if (args.classroom) pq = pq.eq("classroom", args.classroom);
        const { data: projects, error: pe } = await pq;
        if (pe) throw pe;
        if (!projects || projects.length === 0) {
          return { content: [{ type: "text", text: JSON.stringify({ term: args.term, message: "ไม่พบโปรเจกต์ PBL ตามเงื่อนไข" }, null, 2) }] };
        }
        const projMap: Record<string, any> = {};
        projects.forEach((p: any) => { projMap[p.id] = p; });
        const ids = Object.keys(projMap);

        const assess = await fetchAllRows((from, to) => admin.from("pbl_assessments")
          .select("student_id, student_name, project_id, com_score, think_score, problem_score, life_score, tech_score, overall_result")
          .in("project_id", ids)
          .order("id")
          .range(from, to), "pbl_assessments");
        const sevRank: Record<string, number> = { fail: 0, pass: 1, excellent: 2 };
        const sevLabel = ["fail", "pass", "excellent"];
        const pblByKey: Record<string, any> = {};
        (assess || []).forEach((a: any) => {
          const p = projMap[a.project_id] || {};
          const key = `${a.student_id}|${p.grade_level}|${p.classroom}`;
          const total = (a.com_score || 0) + (a.think_score || 0) + (a.problem_score || 0) + (a.life_score || 0) + (a.tech_score || 0);
          if (!pblByKey[key]) pblByKey[key] = { student_id: a.student_id, student_name: a.student_name, grade_level: p.grade_level, classroom: p.classroom, pcts: [], worst: 2 };
          pblByKey[key].pcts.push((total / 15) * 100);
          pblByKey[key].worst = Math.min(pblByKey[key].worst, sevRank[a.overall_result] ?? 1);
        });

        const grades = [...new Set(projects.map((p: any) => p.grade_level))];
        const classes = [...new Set(projects.map((p: any) => p.classroom))];
        const units = await fetchAllRows((from, to) => admin.from("unit_assessments")
          .select("student_id, grade_level, classroom, k_score, k_total, p_score, p_total, a_score, a_total")
          .eq("academic_term", args.term)
          .in("grade_level", grades)
          .in("classroom", classes)
          .order("id")
          .range(from, to), "unit_assessments");
        const unitByKey: Record<string, number[]> = {};
        (units || []).forEach((u: any) => {
          const denom = (u.k_total || 0) + (u.p_total || 0) + (u.a_total || 0);
          if (denom <= 0) return;
          const pct = (((u.k_score || 0) + (u.p_score || 0) + (u.a_score || 0)) / denom) * 100;
          const key = `${u.student_id}|${u.grade_level}|${u.classroom}`;
          (unitByKey[key] ||= []).push(pct);
        });
        const avg = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

        const classesMap: Record<string, any> = {};
        Object.values(pblByKey).forEach((s: any) => {
          const key = `${s.student_id}|${s.grade_level}|${s.classroom}`;
          const pbl_pct = Math.round(avg(s.pcts) as number);
          const unitArr = unitByKey[key];
          const unit_pct = unitArr ? Math.round(avg(unitArr) as number) : null;
          const pbl_result = sevLabel[s.worst];
          const gap = unit_pct === null ? null : Math.round(unit_pct - pbl_pct);
          let pattern: string;
          const flags: string[] = [];
          if (unit_pct === null) {
            pattern = "ไม่มีข้อมูลหลังหน่วย";
          } else if (pbl_result === "fail" && unit_pct < 50) {
            pattern = "เร่งด่วน: อ่อนทั้งเนื้อหาและประยุกต์";
          } else if ((gap as number) >= 10) {
            pattern = "รู้เนื้อหา แต่ประยุกต์ใน PBL ยังอ่อน";
          } else if ((gap as number) <= -10) {
            pattern = "ทำ PBL ได้ แต่ความรู้เนื้อหาตามไม่ทัน";
          } else {
            pattern = "สมดุล";
          }
          if (unit_pct !== null && unit_pct < 50) flags.push("เนื้อหาต่ำกว่า 50%");
          if (pbl_result === "fail") flags.push("ไม่ผ่าน PBL");
          const cls = `${s.grade_level}/${s.classroom}`;
          if (!classesMap[cls]) classesMap[cls] = { class: cls, grade_level: s.grade_level, classroom: s.classroom, students: [], projectIds: new Set() };
          classesMap[cls].students.push({ student_id: s.student_id, student_name: s.student_name, pbl_pct, pbl_result, unit_pct, gap, pattern, flags });
        });
        projects.forEach((p: any) => {
          const cls = `${p.grade_level}/${p.classroom}`;
          if (classesMap[cls]) classesMap[cls].projectIds.add(p.id);
        });

        const classesOut = Object.values(classesMap).map((c: any) => {
          const withUnit = c.students.filter((s: any) => s.unit_pct !== null);
          const cavg = (arr: any[], k: string) => (arr.length ? Math.round(arr.reduce((s: number, x: any) => s + x[k], 0) / arr.length) : null);
          const counts = { at_risk: 0, content_strong_app_weak: 0, app_strong_content_weak: 0, balanced: 0, no_unit: 0 };
          c.students.forEach((s: any) => {
            if (s.unit_pct === null) counts.no_unit++;
            else if (s.pattern.startsWith("เร่งด่วน")) counts.at_risk++;
            else if (s.pattern.startsWith("รู้เนื้อหา")) counts.content_strong_app_weak++;
            else if (s.pattern.startsWith("ทำ PBL")) counts.app_strong_content_weak++;
            else counts.balanced++;
          });
          c.students.sort((a: any, b: any) => {
            const ar = a.pattern.startsWith("เร่งด่วน") ? 0 : 1;
            const br = b.pattern.startsWith("เร่งด่วน") ? 0 : 1;
            if (ar !== br) return ar - br;
            return Math.abs(b.gap ?? 0) - Math.abs(a.gap ?? 0);
          });
          const uAvg = cavg(withUnit, "unit_pct");
          const pAvg = cavg(withUnit, "pbl_pct");
          return {
            class: c.class, grade_level: c.grade_level, classroom: c.classroom,
            projects: c.projectIds.size,
            n_students: c.students.length,
            n_with_unit: withUnit.length,
            class_avg: { pbl_pct: cavg(c.students, "pbl_pct"), unit_pct: uAvg, gap: (uAvg !== null && pAvg !== null) ? uAvg - pAvg : null },
            pattern_counts: counts,
            students: c.students
          };
        }).sort((a: any, b: any) => a.class.localeCompare(b.class, "th"));

        const totalProjects = projects.length;
        const sample_note = totalProjects < 6
          ? "ข้อมูล PBL ยังน้อย (โปรเจกต์น้อย/ห้อง) — ใช้ดูรายคนและรายห้องได้ดี แต่ยังไม่ควรสรุปแนวโน้มหรือเทียบข้ามห้อง"
          : "ข้อมูลเริ่มมากพอสำหรับดูแนวโน้มรายห้อง — ยังควรเทียบภายในห้องเดียวกันเท่านั้น";

        return { content: [{ type: "text", text: JSON.stringify({
          term: args.term,
          note: "วิเคราะห์แยกทีละห้อง — ไม่เทียบข้ามชั้น/ห้อง (คนละหลักสูตร/ครู/เกณฑ์) | gap = หน่วย% − PBL%",
          sample_note,
          classes: classesOut
        }, null, 2) }] };
      }

      case "atlas_teaching_logs_by_teacher": {
        const includeSpecialCare = args.include_special_care === true;
        let query = supabase
          .from("teaching_logs")
          .select("teaching_date, teacher_name, grade_level, classroom, subject, mastery_score, major_gap, key_issue, health_care_status, health_care_ids")
          .eq("academic_term", args.term);
        if (!includeSpecialCare) {
          query = query.or("health_care_status.is.false,health_care_status.is.null");
        }
        if (args.teacher_id) query = query.eq("teacher_id", args.teacher_id);
        if (args.teacher_name) query = query.ilike("teacher_name", `%${args.teacher_name}%`);
        if (args.date_from) query = query.gte("teaching_date", args.date_from);
        if (args.date_to) query = query.lte("teaching_date", args.date_to);
        const { data, error } = await query
          .order("teaching_date", { ascending: false })
          .limit(args.limit || 100);
        if (error) throw error;
        const rows = data || [];
        const scCount = rows.filter((r: any) => r.health_care_status).length;
        return { content: [{ type: "text", text: JSON.stringify({
          term: args.term,
          include_special_care: includeSpecialCare,
          count: rows.length,
          special_care_in_result: scCount,
          note: includeSpecialCare
            ? "รวมบันทึก Special Care แล้ว — ตัวเลขนี้คือภาระงานจริงของครู"
            : "ไม่รวมบันทึก Special Care — ถ้าครูแจ้งว่าบันทึกมากกว่านี้ ให้เรียกซ้ำด้วย include_special_care = true ก่อนสรุปว่าครูกรอกน้อย",
          logs: rows,
        }, null, 2) }] };
      }

      case "update_action_item": {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        if (!Array.isArray(args.ids) || args.ids.length === 0) {
          return { content: [{ type: "text", text: "Error: ต้องระบุ ids อย่างน้อย 1 รายการ" }], isError: true };
        }
        const update: Record<string, any> = {};
        if (args.status !== undefined) update.status = args.status;
        if (args.resolution_note !== undefined) update.resolution_note = args.resolution_note;
        if (Object.keys(update).length === 0) {
          return { content: [{ type: "text", text: "Error: ต้องระบุอย่างน้อยหนึ่งใน status หรือ resolution_note" }], isError: true };
        }
        const { data, error } = await admin
          .from("action_plan_items")
          .update(update)
          .in("id", args.ids)
          .select("id, status, resolution_note");
        if (error) throw error;
        return { content: [{ type: "text", text: JSON.stringify({ updated_count: data?.length || 0, updated: data || [] }, null, 2) }] };
      }

      case "record_nidet_visit": {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        if (!Array.isArray(args.action_item_ids) || args.action_item_ids.length === 0) {
          return { content: [{ type: "text", text: "Error: ต้องระบุ action_item_ids อย่างน้อย 1 รายการ" }], isError: true };
        }
        const rows = args.action_item_ids.map((action_item_id: number) => ({
          action_item_id,
          visit_date: args.visit_date,
          visitor_name: args.visitor_name,
          note: args.note ?? null
        }));
        const { data, error } = await admin
          .from("nidet_visits")
          .insert(rows)
          .select("id, action_item_id, visit_date, visitor_name, note");
        if (error) throw error;
        return { content: [{ type: "text", text: JSON.stringify({ inserted_count: data?.length || 0, inserted: data || [] }, null, 2) }] };
      }

      case "update_plc_session": {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        if (args.session_id === undefined && args.session_date === undefined) {
          return { content: [{ type: "text", text: "Error: ต้องระบุ session_id หรือ session_date อย่างน้อยหนึ่งอย่าง" }], isError: true };
        }
        const update: Record<string, any> = {};
        if (args.next_plc_date !== undefined) update.next_plc_date = args.next_plc_date;
        if (args.outcome_type !== undefined) update.outcome_type = args.outcome_type;
        if (Object.keys(update).length === 0) {
          return { content: [{ type: "text", text: "Error: ต้องระบุอย่างน้อยหนึ่งใน next_plc_date หรือ outcome_type" }], isError: true };
        }
        let query = admin.from("plc_sessions").update(update);
        if (args.session_id !== undefined) query = query.eq("id", args.session_id);
        if (args.session_date !== undefined) query = query.eq("session_date", args.session_date);
        const { data, error } = await query.select("id, session_date, next_plc_date, outcome_type");
        if (error) throw error;
        return { content: [{ type: "text", text: JSON.stringify({ updated_count: data?.length || 0, updated: data || [] }, null, 2) }] };
      }

      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err: any) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }
  if (req.method === "HEAD" || req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", server: "Woranat_School_Atlas_MCP", version: "2.10.0" }), {
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

  const expectedKey = Deno.env.get("ATLAS_MCP_API_KEY");
  let queryKey: string | null = null;
  try {
    queryKey = new URL(req.url).searchParams.get("key");
  } catch {
    queryKey = null;
  }
  const providedKey =
    req.headers.get("x-api-key") ??
    req.headers.get("x-mcp-key") ??
    queryKey;
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  let result: any;
  try {
    switch (method) {
      case "initialize":
        result = { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "Woranat_School_Atlas_MCP", version: "2.10.0" } };
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
