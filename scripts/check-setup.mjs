#!/usr/bin/env node
/**
 * ATLAS — ตรวจสอบการตั้งค่าสำหรับ AI Chat
 * รัน: node scripts/check-setup.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

const results = { ok: [], fail: [] };

function ok(msg) {
  results.ok.push(msg);
  console.log("  \x1b[32m✓\x1b[0m", msg);
}
function fail(msg) {
  results.fail.push(msg);
  console.log("  \x1b[31m✗\x1b[0m", msg);
}

console.log("\n\x1b[1mATLAS Setup Check\x1b[0m\n");

// 1. .env exists
if (!existsSync(envPath)) {
  fail(".env ไม่พบ — สร้างจาก .env.example");
} else {
  ok(".env มีอยู่");
}

let env = {};
if (existsSync(envPath)) {
  try {
    const raw = readFileSync(envPath, "utf8");
    env = Object.fromEntries(
      raw
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .map((l) => {
          const eq = l.indexOf("=");
          const val = l.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
          return [l.slice(0, eq).trim(), val];
        })
    );
  } catch {}
}

if (existsSync(envPath)) {
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL.startsWith("http")) {
    ok("VITE_SUPABASE_URL ตั้งค่าแล้ว");
  } else {
    fail("VITE_SUPABASE_URL ไม่ได้ตั้งค่าหรือไม่ถูกต้อง");
  }

  if (env.VITE_SUPABASE_PUBLISHABLE_KEY && env.VITE_SUPABASE_PUBLISHABLE_KEY.length >= 30) {
    ok("VITE_SUPABASE_PUBLISHABLE_KEY ตั้งค่าแล้ว");
  } else {
    fail("VITE_SUPABASE_PUBLISHABLE_KEY ไม่ได้ตั้งค่าหรือสั้นเกินไป");
  }
}

// 2. Test ai-chat endpoint
const base = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (base && base.startsWith("http")) {
  const chatUrl = `${base.replace(/\/$/, "")}/functions/v1/ai-chat`;
  console.log("\nทดสอบ ai-chat endpoint...");
  try {
    const headers = { "Content-Type": "application/json" };
    if (anonKey && anonKey.length >= 30) headers.Authorization = `Bearer ${anonKey}`;
    const res = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: [{ role: "user", content: "ทดสอบ" }],
        context: "",
      }),
    });

    if (res.ok) {
      ok("ai-chat ตอบสำเร็จ (HTTP " + res.status + ")");
    } else {
      const txt = await res.text();
      let err = "";
      try {
        const j = JSON.parse(txt);
        err = j.error || txt.slice(0, 120);
      } catch {
        err = txt.slice(0, 120);
      }
      fail(`ai-chat ตอบ HTTP ${res.status}: ${err}`);
      if (res.status === 500 && err.includes("LOVABLE_API_KEY")) {
        console.log("\n  \x1b[33m→ แก้ไข: ไปที่ Supabase Dashboard → Edge Functions → Secrets → ตั้งค่า LOVABLE_API_KEY\x1b[0m");
      }
    }
  } catch (e) {
    fail("ไม่สามารถเชื่อมต่อ ai-chat: " + (e.message || String(e)));
  }
} else {
  console.log("\n(ข้ามการทดสอบ ai-chat — ไม่มี VITE_SUPABASE_URL)");
}

// Summary
console.log("\n\x1b[1mสรุป:\x1b[0m");
console.log("  ผ่าน:", results.ok.length);
console.log("  ไม่ผ่าน:", results.fail.length);
if (results.fail.length > 0) {
  console.log("\n\x1b[33mอ่าน SETUP-COMPLETE-GUIDE.md สำหรับวิธีแก้ไข\x1b[0m\n");
  process.exit(1);
}
console.log("\n");
