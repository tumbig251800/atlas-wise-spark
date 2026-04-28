#!/usr/bin/env node
/**
 * ATLAS — ทดสอบ POST /functions/v1/atlas-diagnostic พร้อม JWT จริง
 *
 * วิธีใช้ (เลือกอย่างใดอย่างหนึ่ง):
 * 1) ใส่ access token จากเบราว์เซอร์ (DevTools → Application → Local Storage / Session)
 *    export ATLAS_DIAGNOSTIC_TEST_JWT="eyJ..."
 * 2) ล็อกอินด้วย email/password บัญชีทดสอบ
 *    export ATLAS_TEST_EMAIL="you@example.com"
 *    export ATLAS_TEST_PASSWORD="..."
 *
 * รัน: node scripts/test-atlas-diagnostic-jwt.mjs
 *
 * คาดหวัง: JWT ผ่าน → HTTP 404 + { error: "Log not found" } (ใช้ logId ปลอม)
 *         JWT ไม่ผ่าน → 401
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
const anon = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
let jwt = env.ATLAS_DIAGNOSTIC_TEST_JWT || env.ATLAS_LESSON_PLAN_TEST_JWT || "";
const email = env.ATLAS_TEST_EMAIL || "";
const password = env.ATLAS_TEST_PASSWORD || "";

const fnUrl = `${base}/functions/v1/atlas-diagnostic`;

async function signInPassword() {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || data.message || `HTTP ${res.status}`);
  }
  if (!data.access_token) throw new Error("ไม่มี access_token ใน response");
  return data.access_token;
}

async function main() {
  console.log("\n\x1b[1mATLAS — ทดสอบ atlas-diagnostic + JWT\x1b[0m\n");

  if (!base.startsWith("http") || !anon) {
    console.error("ต้องมี VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY ใน .env");
    process.exit(1);
  }

  if (!jwt) {
    if (!email || !password) {
      console.error(
        "ตั้งค่าอย่างใดอย่างหนึ่ง:\n" +
          "  ATLAS_DIAGNOSTIC_TEST_JWT=<access_token>\n" +
          "หรือ\n" +
          "  ATLAS_TEST_EMAIL + ATLAS_TEST_PASSWORD\n",
      );
      process.exit(1);
    }
    console.log("กำลังล็อกอินรับ access_token...");
    jwt = await signInPassword();
    console.log("  \x1b[32m✓\x1b[0m ได้ access_token แล้ว\n");
  } else {
    console.log("ใช้ ATLAS_DIAGNOSTIC_TEST_JWT จาก env\n");
  }

  const fakeLogId = "00000000-0000-0000-0000-000000000000";
  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ logId: fakeLogId }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  console.log(`POST ${fnUrl}`);
  console.log(`HTTP ${res.status}`);
  console.log(typeof body === "string" ? body : JSON.stringify(body, null, 2));

  if (res.status === 404 && body && body.error === "Log not found") {
    console.log("\n\x1b[32m✓ JWT ถูกต้อง — auth ผ่าน และฟังก์ชันตอบ 404 ตาม logId ปลอม (คาดหวัง)\x1b[0m\n");
    process.exit(0);
  }
  if (res.status === 401) {
    console.log("\n\x1b[31m✗ JWT ไม่ผ่าน (401)\x1b[0m\n");
    process.exit(1);
  }
  console.log("\n\x1b[33m! ได้สถานะอื่น — ตรวจ body ด้านบน\x1b[0m\n");
  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("\x1b[31m", e.message, "\x1b[0m");
  process.exit(1);
});
