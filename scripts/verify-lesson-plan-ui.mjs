#!/usr/bin/env node
/**
 * ตรวจว่า LessonPlanForm ยังมีฟิลด์หน่วยการเรียนและ placeholder ป. ไม่มีสตริง placeholder ม.2 / ป.4 แบบเก่า
 * รัน: npm run verify:lesson-plan-ui
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const formPath = resolve(__dirname, "../src/components/lesson-plan/LessonPlanForm.tsx");
const raw = readFileSync(formPath, "utf8");

const errors = [];
if (!raw.includes("หน่วยการเรียน")) errors.push("ไม่พบ label หน่วยการเรียน");
if (!raw.includes("ป.1/1") && !raw.includes("ป.1")) errors.push("ไม่พบ placeholder ระดับ ป.");
if (raw.includes("ม.2 / ป.4")) errors.push("ยังมี placeholder เก่า ม.2 / ป.4 — ควรลบ");
if (raw.includes("บริบทห้องเรียน (Snapshot)")) errors.push("ยังมีบล็อก Snapshot ใน LessonPlanForm — ควรลบ");

if (errors.length) {
  console.error("verify-lesson-plan-ui FAILED:");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}
console.log("verify-lesson-plan-ui OK:", formPath);
