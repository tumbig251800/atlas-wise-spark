import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, mcp-session-id",
};

const TOOLS = [
  {
    name: "atlas_list_terms",
    description: "แสดงรายการภาคเรียนทั้งหมดและจำนวน teaching log ในแต่ละภาคเรียน",
    inputSchema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "atlas_classroom_kpi",
    description: "แสดง KPI ของแต่ละห้องเรียนในภาคเรียนที่กำหนด เช่น คะแนนเฉลี่ย การกระจาย Gap",
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
    description: "แสดงการกระจายของประเภท Gap (K-Gap/P-Gap/A-Gap/A2-Gap/System-Gap/Success) ในภาคเรียนที่กำหนด",
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
    description: "ตรวจสอบความน่าเชื่อถือของข้อมูล teaching log หา flag ที่น่าสงสัย",
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
    description: "แสดงรายชื่อครูทั้งหมดและสถิติการสอนในภาคเรียนที่กำหนด",
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
        threshold: { type: "number", description: "เกณฑ์คะแนน (default: 50)" }
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
    name: "atlas_teaching_logs_by_teacher",
    description: "บันทึกหลังสอนรายครู (drill-down) — กรองตามครู (ชื่อหรือ teacher_id) + ภาคเรียน + ช่วงวันที่ เรียงวันที่ล่าสุดก่อน สำหรับดูบันทึกดิบรายคน",
    inputSchema: {
      type: "object",
      properties: {
        term: { type: "string", description: "รหัสภาคเรียน เช่น 2569-1" },
        teacher_name: { type: "string", description: "ชื่อครู (ค้นแบบ ILIKE บางส่วนได้) (optional)" },
        teacher_id: { type: "string", description: "teacher_id (uuid) (optional)" },
        date_from: { type: "string", description: "วันที่เริ่ม YYYY-MM-DD (optional)" },
        date_to: { type: "string", description: "วันที่สิ้นสุด YYYY-MM-DD (optional)" },
        limit: { type: "number", description: "จำนวนบันทึกสูงสุด (default 100)" }
      },
      required: ["term"]
    }
  }
];

async function callTool(supabase: any, name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case "atlas_list_terms": {
        const { data, error } = await supabase
          .from("teaching_logs")
          .select("academic_term");
        if (error) throw error;
        const counts: Record<string, number> = {};
        for (const row of data) {
          counts[row.academic_term] = (counts[row.academic_term] || 0) + 1;
        }
        const result = Object.entries(counts)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([term, total_logs]) => ({ term, total_logs }));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_classroom_kpi": {
        const { data, error } = await supabase
          .from("teaching_logs")
          .select("classroom, grade_level, subject, mastery_score, major_gap, teacher_name")
          .eq("academic_term", args.term);
        if (error) throw error;
        const classrooms: Record<string, any> = {};
        for (const row of data) {
          const key = `${row.grade_level}-${row.classroom}`;
          if (!classrooms[key]) {
            classrooms[key] = { grade_level: row.grade_level, classroom: row.classroom, scores: [], gaps: {}, teachers: new Set(), log_count: 0 };
          }
          classrooms[key].scores.push(row.mastery_score || 0);
          classrooms[key].gaps[row.major_gap] = (classrooms[key].gaps[row.major_gap] || 0) + 1;
          if (row.teacher_name) classrooms[key].teachers.add(row.teacher_name);
          classrooms[key].log_count++;
        }
        const result = Object.values(classrooms).map((c: any) => ({
          grade_level: c.grade_level,
          classroom: c.classroom,
          log_count: c.log_count,
          avg_mastery_score: Math.round(c.scores.reduce((a: number, b: number) => a + b, 0) / c.scores.length),
          gap_distribution: c.gaps,
          teachers: Array.from(c.teachers)
        }));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_gap_distribution": {
        const { data, error } = await supabase
          .from("teaching_logs")
          .select("major_gap")
          .eq("academic_term", args.term);
        if (error) throw error;
        const gaps: Record<string, number> = {};
        for (const row of data) {
          gaps[row.major_gap] = (gaps[row.major_gap] || 0) + 1;
        }
        const total = data.length;
        const result = Object.entries(gaps)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .map(([gap_type, count]) => ({ gap_type, count, percentage: Math.round(((count as number) / total) * 100) }));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_key_issues": {
        const limit = args.limit || 10;
        const { data, error } = await supabase
          .from("teaching_logs")
          .select("key_issue")
          .eq("academic_term", args.term)
          .not("key_issue", "is", null)
          .neq("key_issue", "");
        if (error) throw error;
        const issues: Record<string, number> = {};
        for (const row of data) {
          if (row.key_issue) issues[row.key_issue] = (issues[row.key_issue] || 0) + 1;
        }
        const result = Object.entries(issues)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, limit)
          .map(([issue, count]) => ({ issue, count }));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_integrity_flags": {
        const { data, error } = await supabase
          .from("teaching_logs")
          .select("teacher_name, classroom, subject, mastery_score, major_gap, key_issue")
          .eq("academic_term", args.term);
        if (error) throw error;
        const flags = [];
        const perfectWithGap = data.filter((r: any) => r.mastery_score === 100 && r.major_gap !== "success");
        if (perfectWithGap.length > 0) {
          flags.push({ flag_type: "perfect_score_with_gap", description: "คะแนนเต็ม 100 แต่บันทึก Gap", count: perfectWithGap.length,
            examples: perfectWithGap.slice(0, 3).map((r: any) => ({ teacher: r.teacher_name, classroom: r.classroom, subject: r.subject, score: r.mastery_score, gap: r.major_gap })) });
        }
        const zeroWithSuccess = data.filter((r: any) => r.mastery_score === 0 && r.major_gap === "success");
        if (zeroWithSuccess.length > 0) {
          flags.push({ flag_type: "zero_score_with_success", description: "คะแนน 0 แต่บันทึกว่า Success", count: zeroWithSuccess.length,
            examples: zeroWithSuccess.slice(0, 3).map((r: any) => ({ teacher: r.teacher_name, classroom: r.classroom, subject: r.subject })) });
        }
        const gapNoIssue = data.filter((r: any) => r.major_gap !== "success" && (!r.key_issue || r.key_issue.trim() === ""));
        if (gapNoIssue.length > 0) {
          flags.push({ flag_type: "gap_without_key_issue", description: "บันทึก Gap แต่ไม่ระบุปัญหาสำคัญ", count: gapNoIssue.length });
        }
        const suspicious = perfectWithGap.length + zeroWithSuccess.length;
        return { content: [{ type: "text", text: JSON.stringify({ total_logs: data.length, integrity_score: Math.round(((data.length - suspicious) / Math.max(data.length, 1)) * 100), flags }, null, 2) }] };
      }

      case "atlas_teacher_list": {
        const { data, error } = await supabase
          .from("teaching_logs")
          .select("teacher_name, classroom, subject, mastery_score, major_gap, health_care_status")
          .eq("academic_term", args.term);
        if (error) throw error;
        const teachers: Record<string, any> = {};
        for (const row of data) {
          const t = row.teacher_name || "ไม่ระบุ";
          if (!teachers[t]) teachers[t] = { teacher_name: t, log_count: 0, scores: [], gaps: {}, health_care_count: 0 };
          teachers[t].log_count++;
          teachers[t].scores.push(row.mastery_score || 0);
          teachers[t].gaps[row.major_gap] = (teachers[t].gaps[row.major_gap] || 0) + 1;
          if (row.health_care_status) teachers[t].health_care_count++;
        }
        const result = Object.values(teachers).map((t: any) => ({
          teacher_name: t.teacher_name,
          log_count: t.log_count,
          avg_mastery_score: Math.round(t.scores.reduce((a: number, b: number) => a + b, 0) / t.scores.length),
          success_rate: Math.round(((t.gaps["success"] || 0) / t.log_count) * 100),
          health_care_count: t.health_care_count,
          gap_distribution: t.gaps
        })).sort((a: any, b: any) => b.log_count - a.log_count);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_red_zone": {
        const threshold = args.threshold || 50;
        const { data, error } = await supabase
          .from("teaching_logs")
          .select("teacher_name, grade_level, classroom, mastery_score, major_gap")
          .eq("academic_term", args.term);
        if (error) throw error;
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
            avg_score: Math.round(c.scores.reduce((a: number, b: number) => a + b, 0) / c.scores.length),
            gap_rate: Math.round((c.gap_count / c.total) * 100),
            log_count: c.total
          }))
          .filter((c: any) => c.avg_score < threshold)
          .sort((a: any, b: any) => a.avg_score - b.avg_score);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "atlas_plc_sessions": {
        let query = supabase
          .from("plc_sessions")
          .select("id, session_date, topic, plc_type, grade_band, subject, facilitator_name, members, outcome_type, linked_action_item_ids, next_plc_date, problem_statement, approach");
        if (args.date_from) query = query.gte("session_date", args.date_from);
        if (args.date_to) query = query.lte("session_date", args.date_to);
        if (args.outcome_type) query = query.eq("outcome_type", args.outcome_type);
        const { data, error } = await query.order("session_date", { ascending: false });
        if (error) throw error;
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
        let query = supabase
          .from("action_plan_items")
          .select("id, issue_type, severity, status, grade_level, classroom, subject, teacher_name, teacher_id, metric_value, auto_resolved, resolution_note, created_at");
        if (args.status) query = query.eq("status", args.status);
        if (args.teacher_id) query = query.eq("teacher_id", args.teacher_id);
        const { data, error } = await query.order("created_at", { ascending: false });
        if (error) throw error;

        // Cross-reference with PLC sessions and Nidet visits
        const itemIds = data.map((i: any) => i.id);
        const { data: plcLinks } = await supabase
          .from("plc_sessions")
          .select("linked_action_item_ids");
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
        const summary = {
          total: result.length,
          by_status: result.reduce((acc: any, i: any) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {}),
          items_with_plc: result.filter((i: any) => i.has_plc).length,
          items_with_nidet: result.filter((i: any) => i.has_nidet).length,
          items_untouched: result.filter((i: any) => !i.has_plc && !i.has_nidet && (i.status === "open" || i.status === "watching")).length,
          items: result
        };
        return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
      }

      case "atlas_plc_effectiveness": {
        let plcQuery = supabase.from("plc_sessions").select("*");
        if (args.date_from) plcQuery = plcQuery.gte("session_date", args.date_from);
        if (args.date_to) plcQuery = plcQuery.lte("session_date", args.date_to);
        if (args.plc_type && args.plc_type !== "all") plcQuery = plcQuery.eq("plc_type", args.plc_type);
        const { data: sessions, error: plcError } = await plcQuery;
        if (plcError) throw plcError;

        if (!sessions || sessions.length === 0) {
          return { content: [{ type: "text", text: JSON.stringify({ message: "ไม่มี PLC sessions ในช่วงเวลาที่กำหนด" }, null, 2) }] };
        }

        const allLinkedItemIds = new Set<number>();
        for (const s of sessions) {
          if (Array.isArray(s.linked_action_item_ids)) {
            for (const id of s.linked_action_item_ids) allLinkedItemIds.add(id);
          }
        }

        let actionItemsQuery = supabase.from("action_plan_items").select("*");
        if (allLinkedItemIds.size > 0) {
          actionItemsQuery = actionItemsQuery.in("id", Array.from(allLinkedItemIds));
        }
        if (args.teacher_id) actionItemsQuery = actionItemsQuery.eq("teacher_id", args.teacher_id);
        const { data: actionItems } = await actionItemsQuery;

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
        const { data: openItems, error: itemsError } = await supabase
          .from("action_plan_items")
          .select("*")
          .in("status", ["open", "watching"]);
        if (itemsError) throw itemsError;

        const { data: plcSessions } = await supabase.from("plc_sessions").select("linked_action_item_ids");
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
        let query = supabase.from("plc_sessions").select("*");
        if (args.date_from) query = query.gte("session_date", args.date_from);
        if (args.date_to) query = query.lte("session_date", args.date_to);
        const { data: sessions, error } = await query.order("session_date", { ascending: true });
        if (error) throw error;

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
        const { data: openItems, error: itemsError } = await supabase
          .from("action_plan_items")
          .select("*")
          .in("status", ["open", "watching"]);
        if (itemsError) throw itemsError;

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

        const { data: openItems, error: itemsError } = await supabase
          .from("action_plan_items")
          .select("*")
          .in("status", ["open", "watching"]);
        if (itemsError) throw itemsError;

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
        const { data: assess, error: ae } = await admin.from("pbl_assessments")
          .select("project_id, com_score, think_score, problem_score, life_score, tech_score, overall_result")
          .in("project_id", ids);
        if (ae) throw ae;
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
        const { data: assess, error: ae } = await admin.from("pbl_assessments")
          .select("student_id, student_name, project_id, com_score, think_score, problem_score, life_score, tech_score, notes")
          .in("project_id", ids).eq("overall_result", "fail");
        if (ae) throw ae;
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

      case "atlas_teaching_logs_by_teacher": {
        let query = supabase
          .from("teaching_logs")
          .select("teaching_date, teacher_name, grade_level, classroom, subject, mastery_score, major_gap, key_issue, health_care_status")
          .eq("academic_term", args.term);
        if (args.teacher_id) query = query.eq("teacher_id", args.teacher_id);
        if (args.teacher_name) query = query.ilike("teacher_name", `%${args.teacher_name}%`);
        if (args.date_from) query = query.gte("teaching_date", args.date_from);
        if (args.date_to) query = query.lte("teaching_date", args.date_to);
        const { data, error } = await query
          .order("teaching_date", { ascending: false })
          .limit(args.limit || 100);
        if (error) throw error;
        return { content: [{ type: "text", text: JSON.stringify({ term: args.term, count: data?.length || 0, logs: data || [] }, null, 2) }] };
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
    return new Response(JSON.stringify({ status: "ok", server: "Woranat_School_Atlas_MCP", version: "2.4.0" }), {
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
        result = { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "Woranat_School_Atlas_MCP", version: "2.4.0" } };
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
