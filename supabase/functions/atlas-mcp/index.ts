import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { preflightStats } from "./tools/preflight_stats.ts";
import { fetchTeachingLogs } from "./tools/fetch_teaching_logs.ts";
import { getRedZoneSummary } from "./tools/get_red_zone_summary.ts";
import { getTeacherProfiles } from "./tools/get_teacher_profiles.ts";
import { getSpecialCareStudents } from "./tools/get_special_care_students.ts";

const SERVER_NAME = "atlas-mcp";
const SERVER_VERSION = "1.0.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ─── Tool definitions (JSON Schema) ───────────────────────────────────────────

const TOOLS = [
  {
    name: "preflight_stats",
    description:
      "ดูสถิติเบื้องต้นของ teaching logs ก่อนสร้างรายงาน: จำนวน log, จำนวนครู, ช่วงวันที่, Red Zone count (mastery ≤ 2.5), gap distribution",
    inputSchema: {
      type: "object",
      properties: {
        dateFrom: { type: "string", description: "วันเริ่มต้น ISO 8601 เช่น 2026-01-01" },
        dateTo: { type: "string", description: "วันสิ้นสุด ISO 8601 เช่น 2026-05-09" },
        term: { type: "string", description: "ภาคการศึกษา เช่น 1/2568" },
        gradeLevel: { type: "string", description: "ระดับชั้น เช่น ป.1" },
        classroom: { type: "string", description: "ห้องเรียน เช่น 1" },
        subject: { type: "string", description: "วิชา เช่น คณิตศาสตร์" },
        teacherIds: { type: "array", items: { type: "string" }, description: "UUID ของครู (optional)" },
      },
    },
  },
  {
    name: "fetch_teaching_logs",
    description:
      "ดึง teaching logs พร้อม is_red_zone flag สำหรับสร้างรายงาน executive (.xlsx) และ nidet (.docx) — สูงสุด 500 แถวต่อ request",
    inputSchema: {
      type: "object",
      properties: {
        dateFrom: { type: "string" },
        dateTo: { type: "string" },
        term: { type: "string" },
        teacherIds: { type: "array", items: { type: "string" } },
        gradeLevel: { type: "string" },
        classroom: { type: "string" },
        subject: { type: "string" },
        limit: { type: "number", description: "สูงสุด 500 (default 200)" },
        offset: { type: "number", description: "สำหรับ pagination (default 0)" },
      },
    },
  },
  {
    name: "get_red_zone_summary",
    description:
      "สรุปครูและห้องเรียนที่ mastery ≤ 2.5 (Red Zone) จัดกลุ่มตามครู, ชั้น, วิชา — ใช้คู่กับรายงาน executive",
    inputSchema: {
      type: "object",
      properties: {
        dateFrom: { type: "string" },
        dateTo: { type: "string" },
        term: { type: "string" },
        teacherIds: { type: "array", items: { type: "string" } },
        gradeLevel: { type: "string" },
        classroom: { type: "string" },
        subject: { type: "string" },
      },
    },
  },
  {
    name: "get_teacher_profiles",
    description: "ดึงชื่อและรหัสครู (profiles) สำหรับ map teacher_id → ชื่อในรายงาน",
    inputSchema: {
      type: "object",
      properties: {
        teacherIds: {
          type: "array",
          items: { type: "string" },
          description: "UUID ของครู — ถ้าไม่ระบุ ดึงทั้งหมด",
        },
      },
    },
  },
  {
    name: "get_special_care_students",
    description:
      "ดึงนักเรียน Special Care: a2-gap (Immediate Referral) และ health_care_status=true — สำหรับ Compassion Protocol ในรายงาน nidet",
    inputSchema: {
      type: "object",
      properties: {
        dateFrom: { type: "string" },
        dateTo: { type: "string" },
        term: { type: "string" },
        teacherIds: { type: "array", items: { type: "string" } },
        gradeLevel: { type: "string" },
        classroom: { type: "string" },
        subject: { type: "string" },
      },
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function rpcOk(id: unknown, result: unknown): Response {
  return jsonResponse({ jsonrpc: "2.0", id, result });
}

function rpcErr(id: unknown, code: number, message: string): Response {
  return jsonResponse({ jsonrpc: "2.0", id, error: { code, message } });
}

// ─── Tool dispatcher ──────────────────────────────────────────────────────────

async function callTool(
  supabase: ReturnType<typeof createClient>,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "preflight_stats":
      return await preflightStats(supabase, args as Parameters<typeof preflightStats>[1]);
    case "fetch_teaching_logs":
      return await fetchTeachingLogs(supabase, args as Parameters<typeof fetchTeachingLogs>[1]);
    case "get_red_zone_summary":
      return await getRedZoneSummary(supabase, args as Parameters<typeof getRedZoneSummary>[1]);
    case "get_teacher_profiles":
      return await getTeacherProfiles(supabase, args as Parameters<typeof getTeacherProfiles>[1]);
    case "get_special_care_students":
      return await getSpecialCareStudents(supabase, args as Parameters<typeof getSpecialCareStudents>[1]);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  // ── Auth: static API key ──────────────────────────────────────────────────
  const ATLAS_MCP_API_KEY = Deno.env.get("ATLAS_MCP_API_KEY");
  if (!ATLAS_MCP_API_KEY) {
    return jsonResponse({ error: "ATLAS_MCP_API_KEY not configured" }, 500);
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  if (token !== ATLAS_MCP_API_KEY) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // ── Health check ──────────────────────────────────────────────────────────
  const url = new URL(req.url);
  if (req.method === "GET" && (url.pathname.endsWith("/health") || url.pathname.endsWith("/"))) {
    return jsonResponse({ status: "ok", server: SERVER_NAME, version: SERVER_VERSION });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Parse JSON-RPC ────────────────────────────────────────────────────────
  let body: { id?: unknown; method?: string; params?: unknown };
  try {
    body = await req.json();
  } catch {
    return rpcErr(null, -32700, "Parse error");
  }

  const { id = null, method = "", params } = body;

  // notifications (no id) — client does not expect a response
  if (body.id === undefined && method === "notifications/initialized") {
    return new Response(null, { status: 202, headers: CORS });
  }

  // ── Supabase client (service role, never exposed) ─────────────────────────
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    switch (method) {
      case "initialize":
        return rpcOk(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        });

      case "tools/list":
        return rpcOk(id, { tools: TOOLS });

      case "tools/call": {
        const { name, arguments: args = {} } = params as {
          name: string;
          arguments?: Record<string, unknown>;
        };
        const result = await callTool(supabase, name, args);
        return rpcOk(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      }

      case "ping":
        return rpcOk(id, {});

      default:
        return rpcErr(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error(`[atlas-mcp] ${method} error:`, e);
    return rpcErr(id, -32603, msg);
  }
});
