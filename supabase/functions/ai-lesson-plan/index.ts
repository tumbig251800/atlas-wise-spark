import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";
import { requireAtlasUser } from "../_shared/atlasAuth.ts";
import { parseLessonPlanBody } from "../_shared/lessonPlanRequest.ts";
import {
  buildLessonPlanUserContent,
  buildMainLessonSystemPrompt,
  getAddonSystemPrompt,
} from "../_shared/lessonPlanPrompts.ts";

const RATE_LIMIT_SECONDS = 10;
const CLAUDE_MAX_429_RETRIES = 2;
const CLAUDE_BACKOFF_BASE_MS = 5000;
const CLAUDE_BACKOFF_MAX_MS = 10000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseRetryAfterMs(retryAfter: string | null): number | null {
  if (!retryAfter) return null;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) return Math.floor(seconds * 1000);
  const ts = Date.parse(retryAfter);
  if (!Number.isNaN(ts)) return Math.max(0, ts - Date.now());
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === "GET" && (url.pathname.endsWith("/health") || url.pathname === "/health")) {
    return new Response(
      JSON.stringify({ status: "ok", function: "ai-lesson-plan", ts: Date.now() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const auth = await requireAtlasUser(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Rate limit check (atomic, per user, 1 req / RATE_LIMIT_SECONDS) ---
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: allowed, error: rpcError } = await supabaseAdmin.rpc("check_and_set_rate_limit", {
      p_user_id: auth.userId,
      p_function_name: "ai-lesson-plan",
      p_limit_seconds: RATE_LIMIT_SECONDS,
    });
    if (rpcError) {
      console.error("Rate limit RPC error:", rpcError);
    }
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: `กรุณารอ ${RATE_LIMIT_SECONDS} วินาทีก่อนขอแผนการสอนใหม่` }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(RATE_LIMIT_SECONDS),
          },
        }
      );
    }
    // --- End rate limit ---

    const rawBody = await req.json();
    const parsed = parseLessonPlanBody(rawBody);
    if (!parsed.ok) {
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const v = parsed.value;
    const { planType, topic, gradeLevel, classroom, subject, learningUnit, hours, addonType, includeWorksheets } = v;
    const rawKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const ANTHROPIC_API_KEY = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured in Supabase Secrets");

    const systemPrompt = addonType
      ? getAddonSystemPrompt(addonType)
      : buildMainLessonSystemPrompt({
          mode: v.mode,
          planType,
          hours,
          gradeLevel,
          classroom,
          subject,
          learningUnit,
          topic,
          includeWorksheets,
        });

    const userContent = addonType ? topic : buildLessonPlanUserContent(v);

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    // Stream Claude response with retry on 429
    let claudeStream;
    for (let attempt = 0; attempt <= CLAUDE_MAX_429_RETRIES; attempt++) {
      try {
        claudeStream = await anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          temperature: 0,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userContent,
            },
          ],
        });
        break; // Success, exit retry loop
      } catch (error: any) {
        if (error?.status === 429 && attempt < CLAUDE_MAX_429_RETRIES) {
          const retryAfterMs = parseRetryAfterMs(error?.headers?.["retry-after"]);
          const expBackoffMs = Math.min(
            CLAUDE_BACKOFF_BASE_MS * 2 ** attempt,
            CLAUDE_BACKOFF_MAX_MS
          );
          const delayMs = Math.max(1000, retryAfterMs ?? expBackoffMs);
          console.warn(`CLAUDE_429_RETRY lesson-plan attempt=${attempt + 1} delay_ms=${delayMs}`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        // Handle errors
        console.error("Claude lesson plan error:", error);
        if (error?.status === 429) {
          return new Response(JSON.stringify({ error: "คำขอมากเกินไป กรุณารอสักครู่" }), {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": String(RATE_LIMIT_SECONDS),
            },
          });
        }
        if (error?.status === 401 || error?.status === 403) {
          return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY ไม่ถูกต้องหรือไม่ได้ตั้งค่า กรุณาตรวจสอบใน Supabase Secrets" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: `Claude error (${error?.status || "unknown"}). ดู Supabase Logs สำหรับรายละเอียด` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!claudeStream) {
      return new Response(JSON.stringify({ error: "Failed to initialize Claude stream after retries" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Claude streaming → OpenAI-compatible SSE for frontend
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let sentDone = false;
        const sendDone = () => {
          if (sentDone) return;
          sentDone = true;
          try {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (e) {
            console.warn("ai-lesson-plan: enqueue [DONE] failed", e);
          }
        };

        try {
          for await (const event of claudeStream) {
            if (event.type === "content_block_delta") {
              const text = event.delta?.text ?? "";
              if (text) {
                const openAiChunk = { choices: [{ delta: { content: text } }] };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
              }
            } else if (event.type === "message_stop") {
              sendDone();
              break;
            }
          }
        } catch (e) {
          console.error("ai-lesson-plan stream error:", e);
        } finally {
          sendDone();
          try {
            controller.close();
          } catch {
            // ignore double-close / already errored
          }
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("lesson plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
