#!/usr/bin/env node
/**
 * Query teaching_logs to verify data for a given filter.
 * Usage: node scripts/check-teaching-logs.mjs
 * Or with filter: node scripts/check-teaching-logs.mjs "ป.1" "1" "การอ่านและการเขียนเพื่อการสื่อสาร"
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env");
const envLocalPath = resolve(root, ".env.local");

function loadEnv() {
  const files = [envPath, envLocalPath].filter(existsSync);
  for (const p of files) {
    try {
      const content = readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    } catch (_) {}
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL || "https://ebyelctqcdhjmqujeskx.supabase.co";
const key =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k";

const supabase = createClient(url, key);

async function main() {
  const gradeLevel = process.argv[2] || "ป.1";
  const classroom = process.argv[3] || "1";
  const subject = process.argv[4] || "การอ่านและการเขียนเพื่อการสื่อสาร";

  console.log("\n=== ตรวจสอบ teaching_logs ===\n");
  console.log("ตัวกรอง:", { gradeLevel, classroom, subject });
  console.log("");

  // 1. Count all logs
  const { count: totalCount, error: totalErr } = await supabase
    .from("teaching_logs")
    .select("*", { count: "exact", head: true });
  if (totalErr) {
    console.error("Error:", totalErr.message);
    process.exit(1);
  }
  console.log("จำนวน teaching_logs ทั้งหมด:", totalCount);

  // 2. Count filtered
  let q = supabase.from("teaching_logs").select("id, teaching_date, subject, grade_level, classroom, topic", { count: "exact" });
  q = q.eq("grade_level", gradeLevel).eq("classroom", classroom).eq("subject", subject).order("teaching_date", { ascending: false }).limit(20);

  const { data, count, error } = await q;
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log(`\nจำนวนที่ตรงกับตัวกรอง (${gradeLevel}/${classroom} ${subject}):`, count);

  // 3. List unique values in DB for debugging
  const { data: allSample } = await supabase
    .from("teaching_logs")
    .select("grade_level, classroom, subject")
    .limit(500);
  const grades = [...new Set((allSample || []).map((r) => r.grade_level))].sort();
  const classrooms = [...new Set((allSample || []).map((r) => String(r.classroom)))].sort();
  const subjects = [...new Set((allSample || []).map((r) => r.subject))].filter(Boolean).sort();
  console.log("\nค่าที่มีใน DB (sample 500 แถว):");
  console.log("  grade_level:", grades.slice(0, 15).join(", "), grades.length > 15 ? "..." : "");
  console.log("  classroom:", classrooms.slice(0, 10).join(", "));
  console.log("  subject (ที่มี 'การอ่าน'):", subjects.filter((s) => s?.includes("การอ่าน")).join(" | ") || "(ไม่มี)");

  if (data && data.length > 0) {
    console.log("\n--- ตัวอย่าง 5 แถวล่าสุด ---");
    data.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.teaching_date} | ${r.subject} | ${r.grade_level}/${r.classroom} | ${r.topic || "-"}`);
    });
  } else {
    console.log("\n⚠️ ไม่พบข้อมูลที่ตรงกับตัวกรองนี้");
    console.log("   ลองเช็คว่าค่า grade_level/classroom/subject ใน DB เป็นแบบไหน (ดูด้านบน)");
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
