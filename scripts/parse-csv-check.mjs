#!/usr/bin/env node
/**
 * Test parse the user's CSV to verify row count and unit distribution
 * Run: node scripts/parse-csv-check.mjs
 */
import { readFileSync } from "fs";

const path = "/Users/tum_macmini/Downloads/บันทึกหลังสอนไทย ป.4_2 แก้ไข - ชีต1 (แก้ไขล่าสุด).csv";

let text;
try {
  text = readFileSync(path, "utf-8");
} catch (e) {
  console.error("Cannot read file:", e.message);
  process.exit(1);
}

// Minimal CSV parse - split by lines, handle quoted fields loosely
const BOM = "\uFEFF";
const cleaned = text.replace(BOM, "");
const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());

// Find data rows (start with date pattern)
const DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{4}|^\d{4}-\d{2}-\d{2}/;
let dataRows = 0;
const unitCounts = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  // Simple parse: split by comma, but be careful with quotes
  const firstField = line.split(",")[0]?.trim().replace(/^"/, "") || "";
  if (DATE_PATTERN.test(firstField)) {
    dataRows++;
    // Column 8 is unit (index 7 in 0-based) - approximate
    const cols = [];
    let cur = "";
    let inq = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') inq = !inq;
      else if (!inq && c === ",") {
        cols.push(cur.trim());
        cur = "";
      } else cur += c;
    }
    cols.push(cur.trim());
    const unit = cols[7] || cols[8] || "";
    const m = unit.match(/หน่วย(ที่)?\s*(\d+)|Unit\s*(\d+)/i) || unit.match(/(\d+)/);
    const num = m ? (parseInt(m[2] || m[3] || m[1], 10)) : "?";
    unitCounts[num] = (unitCounts[num] || 0) + 1;
  }
}

console.log("=== CSV Parse Check ===\n");
console.log("File:", path);
console.log("Total data rows:", dataRows);
console.log("Unit distribution:");
Object.entries(unitCounts)
  .sort((a, b) => (typeof a[0] === "number" ? a[0] : 999) - (typeof b[0] === "number" ? b[0] : 999))
  .forEach(([u, c]) => console.log(`  หน่วย ${u}: ${c} คาบ`));
