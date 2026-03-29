#!/usr/bin/env node
/**
 * ATLAS — Regression ai-lesson-plan (มี.ค. 2026)
 * - GET /health (ไม่ต้อง JWT)
 * - POST ไม่มี JWT → 401
 * - ถ้าตั้ง ATLAS_LESSON_PLAN_TEST_JWT (access token จาก session ในเบราว์เซอร์):
 *   - body v2 + snapshot ผิดรูปแบบ → 400
 *   - POST v2 reflection + อ่าน chunk แรกของสตรีม
 *   - POST v2 context_snapshot + อ่าน chunk แรกของสตรีม
 *
 * รัน: npm run test:regression-lesson-plan
 *
 * หมายเหตุ: การทดสอบที่มี JWT เรียก Gemini จริง — อาจได้ 429/402 หากโควต้าหมด
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const raw = readFileSync(envPath, "utf8");
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("#"))
      .map((l) => {
        const eq = l.indexOf("=");
        const val = l.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        return [l.slice(0, eq).trim(), val];
      }),
  );
}

const env = { ...loadEnv(), ...process.env };
const base = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const jwt = env.ATLAS_LESSON_PLAN_TEST_JWT || "";
const url = `${base}/functions/v1/ai-lesson-plan`;
const FETCH_MS = 20000;

/** @param {RequestInit & { timeoutMs?: number }} opts */
async function fetchTimeout(resource, opts = {}) {
  const { timeoutMs = FETCH_MS, ...rest } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(resource, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

const ok = [];
const fail = [];
const warn = [];

function pass(m) {
  ok.push(m);
  console.log("  \x1b[32m✓\x1b[0m", m);
}
function err(m) {
  fail.push(m);
  console.log("  \x1b[31m✗\x1b[0m", m);
}
function note(m) {
  warn.push(m);
  console.log("  \x1b[33m!\x1b[0m", m);
}

console.log("\n\x1b[1mATLAS regression — ai-lesson-plan\x1b[0m\n");

if (!base.startsWith("http")) {
  err("VITE_SUPABASE_URL ไม่ได้ตั้ง — ข้าม");
  process.exit(1);
}

// 1) Health
console.log("1) GET .../ai-lesson-plan/health");
try {
  const res = await fetchTimeout(`${url}/health`, { method: "GET" });
  if (res.ok) pass(`health → ${res.status}`);
  else err(`health → HTTP ${res.status}`);
} catch (e) {
  err(`health → ${e.message}`);
}

// 2) No JWT
console.log("\n2) POST ไม่มี Authorization");
try {
  const res = await fetchTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      version: 2,
      mode: "reflection",
      planType: "hourly",
      gradeLevel: "ม.1",
      classroom: "1",
      subject: "คณิต",
      learningUnit: "หน่วยที่ 1",
      topic: "smoke",
      hours: 1,
      includeWorksheets: false,
      context: "test",
    }),
  });
  if (res.status === 401) pass("POST ไม่มี JWT → 401");
  else err(`POST ไม่มี JWT → HTTP ${res.status}`);
} catch (e) {
  err(`POST ไม่มี JWT → ${e.message}`);
}

async function readFirstSseDataLine(body) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (let i = 0; i < 200; i++) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const idx = buf.indexOf("\n");
    if (idx !== -1) {
      const line = buf.slice(0, idx).replace(/\r$/, "");
      await reader.cancel().catch(() => {});
      return line;
    }
  }
  await reader.cancel().catch(() => {});
  return "";
}

// 3) Optional JWT tests
if (!jwt.trim()) {
  note("ไม่มี ATLAS_LESSON_PLAN_TEST_JWT — ข้ามทดสอบ POST ที่ต้องมี session (วาง token จาก DevTools → Application → Session)");
} else {
  const auth = { Authorization: `Bearer ${jwt.trim()}`, "Content-Type": "application/json" };

  console.log("\n3) POST v2 snapshot ผิดรูปแบบ (array) → คาด 400");
  try {
    const res = await fetchTimeout(url, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        version: 2,
        mode: "context_snapshot",
        planType: "hourly",
        gradeLevel: "ม.1",
        classroom: "1",
        subject: "คณิต",
        learningUnit: "หน่วยที่ 1",
        topic: "smoke",
        hours: 1,
        includeWorksheets: false,
        context: "",
        snapshot: [],
      }),
    });
    if (res.status === 400) pass("snapshot เป็น array → 400");
    else err(`snapshot เป็น array → HTTP ${res.status} (คาด 400)`);
  } catch (e) {
    err(`invalid snapshot → ${e.message}`);
  }

  const v2Reflection = {
    version: 2,
    mode: "reflection",
    planType: "hourly",
    gradeLevel: "ม.1",
    classroom: "1",
    subject: "คณิต",
    learningUnit: "หน่วยที่ 1",
    topic: "smoke regression",
    hours: 1,
    includeWorksheets: false,
    context: "จาก 0 คาบล่าสุด: smoke",
  };

  console.log("\n4) POST v2 reflection — อ่านสตรีม chunk แรก");
  try {
    const res = await fetchTimeout(url, { method: "POST", headers: auth, body: JSON.stringify(v2Reflection) });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) note(`reflection → 429 (rate limit) ${t.slice(0, 80)}`);
      else if (res.status === 402) note(`reflection → 402 (เครดิต) ${t.slice(0, 80)}`);
      else err(`reflection → HTTP ${res.status} ${t.slice(0, 120)}`);
    } else if (!res.body) {
      err("reflection → ไม่มี body");
    } else {
      const line = await readFirstSseDataLine(res.body);
      if (line.startsWith("data: ") && line.includes("choices")) pass("reflection → SSE chunk แรกรับได้");
      else if (line.startsWith("data: ")) pass("reflection → SSE เริ่มแล้ว");
      else note(`reflection → บรรทัดแรกไม่คาด: ${line.slice(0, 100)}`);
    }
  } catch (e) {
    err(`reflection stream → ${e.message}`);
  }

  const v2Snapshot = {
    version: 2,
    mode: "context_snapshot",
    planType: "hourly",
    gradeLevel: "ม.1",
    classroom: "1",
    subject: "คณิต",
    learningUnit: "หน่วยที่ 1",
    topic: "smoke snapshot",
    hours: 1,
    includeWorksheets: false,
    context: "",
    snapshot: { class_profile: "smoke regression snapshot" },
  };

  console.log("\n5) POST v2 context_snapshot — อ่านสตรีม chunk แรก");
  try {
    const res = await fetchTimeout(url, { method: "POST", headers: auth, body: JSON.stringify(v2Snapshot) });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) note(`snapshot → 429 (rate limit) ${t.slice(0, 80)}`);
      else if (res.status === 402) note(`snapshot → 402 (เครดิต) ${t.slice(0, 80)}`);
      else err(`snapshot → HTTP ${res.status} ${t.slice(0, 120)}`);
    } else if (!res.body) {
      err("snapshot → ไม่มี body");
    } else {
      const line = await readFirstSseDataLine(res.body);
      if (line.startsWith("data: ")) pass("context_snapshot → SSE chunk แรกรับได้");
      else note(`snapshot → บรรทัดแรก: ${line.slice(0, 100)}`);
    }
  } catch (e) {
    err(`snapshot stream → ${e.message}`);
  }
}

console.log("\n\x1b[1mสรุป:\x1b[0m ผ่าน", ok.length, "ไม่ผ่าน", fail.length);
if (warn.length) console.log("หมายเหตุ:", warn.length);
if (fail.length) process.exit(1);
console.log("");
