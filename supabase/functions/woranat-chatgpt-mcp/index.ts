import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.7";

const SERVER = { name: "Woranat_ChatGPT_MCP", version: "1.0.0" };
const ALLOWED_ROLES = ["director", "lead"];
const INDIVIDUAL_TOOLS = new Set([
  "kg_child_status",
  "atlas_pbl_student",
  "atlas_pbl_failing",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", ...extraHeaders },
  });
}

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function publicResourceUrl(): string {
  return `${env("SUPABASE_URL")}/functions/v1/woranat-chatgpt-mcp`;
}

function protectedResourceUrl(): string {
  return `${publicResourceUrl()}/.well-known/oauth-protected-resource`;
}

function oauthMetadata() {
  const supabaseUrl = env("SUPABASE_URL");
  return {
    resource: publicResourceUrl(),
    authorization_servers: [`${supabaseUrl}/auth/v1`],
    scopes_supported: ["openid", "email", "profile"],
    bearer_methods_supported: ["header"],
  };
}

async function authorize(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return { ok: false as const, status: 401, reason: "missing_bearer_token" };

  const supabaseUrl = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const token = match[1];

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false as const, status: 401, reason: "invalid_or_expired_token" };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: roles, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .in("role", ALLOWED_ROLES);

  if (roleError || !roles?.length) {
    return { ok: false as const, status: 403, reason: "role_not_allowed" };
  }
  return { ok: true as const, userId: userData.user.id };
}

type Upstream = "atlas" | "kindergarten";

async function callUpstream(upstream: Upstream, body: unknown) {
  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  let endpoint: string;

  if (upstream === "atlas") {
    endpoint = `${supabaseUrl}/functions/v1/woranat-atlas-mcp`;
    headers.Authorization = `Bearer ${serviceRoleKey}`;
    headers.apikey = serviceRoleKey;
  } else {
    endpoint = `${supabaseUrl}/functions/v1/kindergarten-mcp`;
    // kindergarten-mcp authenticates on header `x-api-key` == KINDERGARTEN_MCP_API_KEY
    // (see kindergarten-mcp/index.ts). Must match exactly or every call 401s.
    headers["x-api-key"] = env("KINDERGARTEN_MCP_API_KEY");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${upstream} upstream failed (${response.status})`);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${upstream} upstream returned invalid JSON`);
  }
}

function individualToolsEnabled() {
  return Deno.env.get("WORANAT_ALLOW_INDIVIDUAL_TOOLS") === "true";
}

async function listTools(id: unknown) {
  const request = { jsonrpc: "2.0", id: "tools-list", method: "tools/list", params: {} };
  // Degrade gracefully: a single failing upstream must NOT blank out the entire
  // tool list (otherwise ChatGPT sees "no functions" for everything).
  const [atlasSettled, kindergartenSettled] = await Promise.allSettled([
    callUpstream("atlas", request),
    callUpstream("kindergarten", request),
  ]);
  if (atlasSettled.status === "rejected") {
    console.error("atlas upstream tools/list failed:", atlasSettled.reason?.message ?? atlasSettled.reason);
  }
  if (kindergartenSettled.status === "rejected") {
    console.error("kindergarten upstream tools/list failed:", kindergartenSettled.reason?.message ?? kindergartenSettled.reason);
  }
  const atlas = atlasSettled.status === "fulfilled" ? atlasSettled.value : null;
  const kindergarten = kindergartenSettled.status === "fulfilled" ? kindergartenSettled.value : null;
  const tools = [...(atlas?.result?.tools ?? []), ...(kindergarten?.result?.tools ?? [])]
    .filter((tool: { name?: string }) =>
      individualToolsEnabled() || !INDIVIDUAL_TOOLS.has(String(tool?.name ?? ""))
    )
    .map((tool: Record<string, unknown>) => ({
      ...tool,
      annotations: {
        ...((tool.annotations as Record<string, unknown> | undefined) ?? {}),
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    }));
  return { jsonrpc: "2.0", id: id ?? null, result: { tools } };
}

async function callTool(id: unknown, params: { name?: string; arguments?: unknown } | undefined) {
  const name = String(params?.name ?? "");
  if (!individualToolsEnabled() && INDIVIDUAL_TOOLS.has(name)) {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32003, message: "เน€เธเธฃเธทเนเธญเธเธกเธทเธญเธฃเธฒเธขเธเธธเธเธเธฅเธ–เธนเธเธเธดเธ”เน€เธเธทเนเธญเธเธธเนเธกเธเธฃเธญเธเธเนเธญเธกเธนเธฅเน€เธ”เนเธ" },
    };
  }
  const upstream: Upstream = name.startsWith("kg_") ? "kindergarten" : "atlas";
  if (!name.startsWith("kg_") && !name.startsWith("atlas_")) {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32601, message: `Unknown tool: ${name}` },
    };
  }
  return await callUpstream(upstream, {
    jsonrpc: "2.0",
    id: id ?? null,
    method: "tools/call",
    params: { name, arguments: params?.arguments ?? {} },
  });
}

Deno.serve(async (req: Request) => {
  const requestUrl = new URL(req.url);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (requestUrl.pathname.endsWith("/.well-known/oauth-protected-resource")) {
    return json(oauthMetadata());
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return json({ status: "ok", server: SERVER.name, version: SERVER.version });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const access = await authorize(req);
  if (!access.ok) {
    const challenge = `Bearer resource_metadata="${protectedResourceUrl()}"`;
    return json(
      { error: access.reason },
      access.status,
      access.status === 401 ? { "WWW-Authenticate": challenge } : {},
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 1_000_000) return json({ error: "Payload too large" }, 413);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON" } });
  }

  if (typeof body?.method === "string" && body.method.startsWith("notifications/")) {
    return new Response(null, { status: 202, headers: CORS });
  }

  try {
    switch (body?.method) {
      case "initialize":
        return json({
          jsonrpc: "2.0",
          id: body.id ?? null,
          result: {
            protocolVersion: "2025-11-25",
            capabilities: { tools: { listChanged: false } },
            serverInfo: SERVER,
          },
        });
      case "ping":
        return json({ jsonrpc: "2.0", id: body.id ?? null, result: {} });
      case "tools/list":
        return json(await listTools(body.id));
      case "tools/call":
        return json(await callTool(body.id, body.params));
      default:
        return json({
          jsonrpc: "2.0",
          id: body?.id ?? null,
          error: { code: -32601, message: `Method not found: ${body?.method}` },
        });
    }
  } catch (error) {
    console.error("MCP request failed", error instanceof Error ? error.message : "unknown");
    return json({
      jsonrpc: "2.0",
      id: body?.id ?? null,
      error: { code: -32603, message: "Internal MCP gateway error" },
    });
  }
});
