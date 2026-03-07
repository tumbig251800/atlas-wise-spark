#!/usr/bin/env node
/**
 * ATLAS — Negative & Edge Case Tests (NEGATIVE_TESTS.md)
 * รัน: npm run test:negative
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
      })
  );
}

const env = loadEnv();
const base = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const ok = [], fail = [];

function pass(msg) {
  ok.push(msg);
  console.log("  \x1b[32m✓\x1b[0m", msg);
}
function err(msg) {
  fail.push(msg);
  console.log("  \x1b[31m✗\x1b[0m", msg);
}

console.log("\n\x1b[1mATLAS Negative Tests (NEGATIVE_TESTS.md)\x1b[0m\n");

if (!base.startsWith("http")) {
  err("VITE_SUPABASE_URL ไม่ได้ตั้งค่า — ข้ามการทดสอบ");
  console.log("\nสรุป: ผ่าน 0, ไม่ผ่าน 1\n");
  process.exit(1);
}

// 4.2 Auth ขาด — เรียก ai-chat โดยไม่มี Authorization → คาดหวัง 401
console.log("4.2 Auth ขาด — ai-chat โดยไม่มี JWT...");
try {
  const res = await fetch(`${base}/functions/v1/ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "test" }],
      context: "",
    }),
  });
  if (res.status === 401) {
    pass("ai-chat ไม่มี JWT → 401 (ผ่าน)");
  } else {
    err(`ai-chat ไม่มี JWT → HTTP ${res.status} (คาดหวัง 401)`);
    const txt = await res.text().catch(() => "");
    if (txt.length < 100) console.log("    Response:", txt.slice(0, 80));
  }
} catch (e) {
  err(`ai-chat ไม่มี JWT → ${e.message}`);
}

// 4.2b — ai-lesson-plan ไม่มี JWT
console.log("\n4.2b Auth ขาด — ai-lesson-plan โดยไม่มี JWT...");
try {
  const res = await fetch(`${base}/functions/v1/ai-lesson-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: "คณิตศาสตร์",
      gradeLevel: "ป.4",
      classroom: "1",
      topic: "เศษส่วน",
      context: "",
      planType: "hourly",
    }),
  });
  if (res.status === 401) {
    pass("ai-lesson-plan ไม่มี JWT → 401 (ผ่าน)");
  } else {
    err(`ai-lesson-plan ไม่มี JWT → HTTP ${res.status} (คาดหวัง 401)`);
  }
} catch (e) {
  err(`ai-lesson-plan ไม่มี JWT → ${e.message}`);
}

// 4.2c — ai-summary ไม่มี JWT
console.log("\n4.2c Auth ขาด — ai-summary โดยไม่มี JWT...");
try {
  const res = await fetch(`${base}/functions/v1/ai-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs_summary: "test" }),
  });
  if (res.status === 401) {
    pass("ai-summary ไม่มี JWT → 401 (ผ่าน)");
  } else {
    err(`ai-summary ไม่มี JWT → HTTP ${res.status} (คาดหวัง 401)`);
  }
} catch (e) {
  err(`ai-summary ไม่มี JWT → ${e.message}`);
}

// 4.2d — ai-exam-gen ไม่มี JWT
console.log("\n4.2d Auth ขาด — ai-exam-gen โดยไม่มี JWT...");
try {
  const res = await fetch(`${base}/functions/v1/ai-exam-gen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gradeLevel: "ป.4",
      classroom: "1",
      subject: "คณิตศาสตร์",
      topic: "เศษส่วน",
      context: "",
    }),
  });
  if (res.status === 401) {
    pass("ai-exam-gen ไม่มี JWT → 401 (ผ่าน)");
  } else {
    err(`ai-exam-gen ไม่มี JWT → HTTP ${res.status} (คาดหวัง 401)`);
  }
} catch (e) {
  err(`ai-exam-gen ไม่มี JWT → ${e.message}`);
}

// 4.2e — atlas-diagnostic ไม่มี JWT
console.log("\n4.2e Auth ขาด — atlas-diagnostic โดยไม่มี JWT...");
try {
  const res = await fetch(`${base}/functions/v1/atlas-diagnostic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logId: "00000000-0000-0000-0000-000000000000", remedialStatuses: [] }),
  });
  if (res.status === 401) {
    pass("atlas-diagnostic ไม่มี JWT → 401 (ผ่าน)");
  } else {
    err(`atlas-diagnostic ไม่มี JWT → HTTP ${res.status} (คาดหวัง 401)`);
  }
} catch (e) {
  err(`atlas-diagnostic ไม่มี JWT → ${e.message}`);
}

console.log("\n\x1b[1mสรุป:\x1b[0m");
console.log("  ผ่าน:", ok.length);
console.log("  ไม่ผ่าน:", fail.length);
if (fail.length > 0) {
  console.log("\n\x1b[33mหมายเหตุ: ถ้า verify_jwt=false ฟังก์ชันอาจตอบ 200 โดยไม่ต้องมี JWT\x1b[0m");
  console.log("  ดู NEGATIVE_TESTS.md สำหรับรายละเอียด\n");
  process.exit(1);
}
console.log("\n");
