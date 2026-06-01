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
    return new Response(JSON.stringify({ status: "ok", server: "Woranat_School_Atlas_MCP", version: "2.1.0" }), {
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
        result = { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "Woranat_School_Atlas_MCP", version: "2.1.0" } };
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
