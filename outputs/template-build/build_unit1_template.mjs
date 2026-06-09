import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "/Users/tum_macmini/atlas-wise-spark/outputs";
const outputPath = `${outputDir}/ATLAS_template_roster_unit1.xlsx`;

const workbook = Workbook.create();
const sheet = workbook.worksheets.getOrAdd("ป.4.1", {
  renameFirstIfOnlyNewSpreadsheet: true,
});
sheet.reset();

const guide = workbook.worksheets.getOrAdd("คำแนะนำ");
guide.reset();

const sample = workbook.worksheets.getOrAdd("ตัวอย่าง");
sample.reset();

// Parser contract:
// - sheet name must match ป.X.Y
// - data starts at row 4
// - student code/name are A/C
// - Unit 1 score is E
sheet.getRange("A1:E1").values = [["ชื่อหน่วยการเรียน", "", "", "คะแนนเต็มรวม", ""]];
sheet.getRange("A2:E2").values = [["ตารางนำเข้ารายชื่อนักเรียนและคะแนนหน่วยที่ 1", "", "", "", ""]];
sheet.getRange("A2:E2").merge();
sheet.getRange("A3:E3").values = [["รหัสประจำตัวนักเรียน", "เลขที่", "ชื่อ-สกุล", "ชั้น", "คะแนนหน่วยที่ 1"]];
sheet.getRange("A4:E53").values = Array.from({ length: 50 }, () => ["", "", "", "", ""]);

sheet.getRange("A1:E1").format = {
  fill: "#E0F2FE",
  font: { name: "TH Sarabun New", bold: true, size: 14, color: "#0F172A" },
  borders: { preset: "all", style: "thin", color: "#94A3B8" },
  verticalAlignment: "center",
};
sheet.getRange("B1:C1").merge();
sheet.getRange("E1").format.fill = "#F8FAFC";

sheet.getRange("A2:E2").format = {
  fill: "#1F4E79",
  font: { name: "TH Sarabun New", bold: true, size: 18, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("A3:E3").format = {
  fill: "#D9EAF7",
  font: { name: "TH Sarabun New", bold: true, size: 14, color: "#1F2937" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#94A3B8" },
};
sheet.getRange("A4:E53").format = {
  font: { name: "TH Sarabun New", size: 14 },
  borders: { preset: "all", style: "thin", color: "#D1D5DB" },
  verticalAlignment: "center",
};
sheet.getRange("A4:B53").format.horizontalAlignment = "center";
sheet.getRange("D4:E53").format.horizontalAlignment = "center";
sheet.getRange("E4:E53").format.numberFormat = "0.##";
sheet.getRange("A:A").format.columnWidthPx = 155;
sheet.getRange("B:B").format.columnWidthPx = 70;
sheet.getRange("C:C").format.columnWidthPx = 300;
sheet.getRange("D:D").format.columnWidthPx = 80;
sheet.getRange("E:E").format.columnWidthPx = 130;
sheet.freezePanes.freezeRows(3);
sheet.freezePanes.freezeColumns(3);

guide.getRange("A1:B1").values = [["คู่มือใช้ Template ATLAS", ""]];
guide.getRange("A1:B1").merge();
guide.getRange("A3:B13").values = [
  ["ใช้สำหรับ", "นำเข้ารายชื่อนักเรียน และคะแนนรวมหน่วยที่ 1 เท่านั้น"],
  ["ชื่อชีต", "ตั้งชื่อชีตเป็นรูปแบบ ป.X.Y เช่น ป.4.1 หรือ ป.6.KBW"],
  ["ชื่อหน่วยการเรียน", "กรอกที่ช่อง B1 แล้วนำข้อความเดียวกันไปกรอกในช่องชื่อเรื่อง/ชื่อหน่วยใน ATLAS"],
  ["คะแนนเต็มรวม", "กรอกที่ช่อง E1 เพื่อใช้เตือนตัวเอง แล้วตั้ง K/P/A ใน ATLAS ให้รวมเท่ากัน"],
  ["ข้อมูลนักเรียน", "เริ่มกรอกแถว 4 ห้ามลบแถวหัว 1-3"],
  ["รหัสประจำตัว", "กรอกที่คอลัมน์ A"],
  ["เลขที่", "กรอกที่คอลัมน์ B ใช้แสดง preview เท่านั้น"],
  ["ชื่อ-สกุล", "กรอกที่คอลัมน์ C เช่น เด็กหญิงปาณิสรา เชยชูชาติ"],
  ["ชั้น", "คอลัมน์ D จะกรอกหรือเว้นได้ ระบบใช้ชื่อชีตเป็นหลัก"],
  ["คะแนนหน่วยที่ 1", "กรอกคะแนนรวมหน่วยที่ 1 ที่คอลัมน์ E ถ้ายังไม่มีคะแนนให้เว้นว่างได้"],
  ["หน่วยถัดไป", "ไม่ต้องทำ Excel แล้ว ให้กรอกใน Grid ของ ATLAS หลังจาก seed รายชื่อแล้ว"],
];
guide.getRange("A1:B1").format = {
  fill: "#1F4E79",
  font: { name: "TH Sarabun New", bold: true, size: 18, color: "#FFFFFF" },
  horizontalAlignment: "center",
};
guide.getRange("A3:A13").format = {
  fill: "#E0F2FE",
  font: { name: "TH Sarabun New", bold: true, size: 14 },
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
};
guide.getRange("B3:B13").format = {
  font: { name: "TH Sarabun New", size: 14 },
  wrapText: true,
  borders: { preset: "all", style: "thin", color: "#CBD5E1" },
};
guide.getRange("A:A").format.columnWidthPx = 160;
guide.getRange("B:B").format.columnWidthPx = 650;

sample.getRange("A1:E1").values = [["ชื่อหน่วยการเรียน", "พลังงานและสิ่งมีชีวิต", "", "คะแนนเต็มรวม", 20]];
sample.getRange("A2:E2").values = [["ตัวอย่างการกรอก (ชีตนี้ไม่ถูก import)", "", "", "", ""]];
sample.getRange("A2:E2").merge();
sample.getRange("A3:E6").values = [
  ["รหัสประจำตัวนักเรียน", "เลขที่", "ชื่อ-สกุล", "ชั้น", "คะแนนหน่วยที่ 1"],
  ["9009", 1, "เด็กหญิงปาณิสรา เชยชูชาติ", "ป.4", 18],
  ["9018", 2, "เด็กชายปัณณวรรธ ศรัทธานนท์", "ป.4", ""],
  ["9044", 3, "เด็กชายศิรภัทร เทียนมงคล", "ป.4", 17],
];
sample.getRange("A1:E1").format = sheet.getRange("A1:E1").format;
sample.getRange("A2:E2").format = sheet.getRange("A2:E2").format;
sample.getRange("A3:E3").format = sheet.getRange("A3:E3").format;
sample.getRange("A4:E6").format = {
  font: { name: "TH Sarabun New", size: 14 },
  borders: { preset: "all", style: "thin", color: "#D1D5DB" },
};
sample.getRange("A:A").format.columnWidthPx = 155;
sample.getRange("B:B").format.columnWidthPx = 70;
sample.getRange("C:C").format.columnWidthPx = 300;
sample.getRange("D:E").format.columnWidthPx = 120;

await fs.mkdir(outputDir, { recursive: true });
const check = await workbook.inspect({
  kind: "table",
  range: "ป.4.1!A1:E8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 5,
});
console.log(check.ndjson);
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});
console.log(errors.ndjson);
await workbook.render({ sheetName: "ป.4.1", range: "A1:E16", format: "png" });
await workbook.render({ sheetName: "คำแนะนำ", range: "A1:B13", format: "png" });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`saved:${outputPath}`);
