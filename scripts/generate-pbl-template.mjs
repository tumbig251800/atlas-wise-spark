#!/usr/bin/env node

/**
 * Generate PBL Assessment Import Template
 * Creates an Excel file with the correct structure for importing PBL assessments
 */

import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample data
const sampleData = [
  {
    student_id: '65001',
    student_name: 'สมชาย ใจดี',
    grade_level: 'ป.4',
    classroom: 'KBW',
    teacher_name: 'อ.สมหญิง',
    project_name: 'โปรเจกต์สิ่งแวดล้อม',
    academic_term: '2568-2',
    month: 'พฤศจิกายน',
    com_score: 3,
    think_score: 3,
    problem_score: 3,
    life_score: 2,
    tech_score: 3,
    total_score: 14,
    overall_result: 'excellent',
    notes: 'นักเรียนมีความคิดสร้างสรรค์'
  },
  {
    student_id: '65002',
    student_name: 'สมหมาย รักเรียน',
    grade_level: 'ป.4',
    classroom: 'KBW',
    teacher_name: 'อ.สมหญิง',
    project_name: 'โปรเจกต์สิ่งแวดล้อม',
    academic_term: '2568-2',
    month: 'พฤศจิกายน',
    com_score: 2,
    think_score: 2,
    problem_score: 2,
    life_score: 2,
    tech_score: 2,
    total_score: 10,
    overall_result: 'pass',
    notes: ''
  },
  {
    student_id: '65003',
    student_name: 'สมศรี เรียนดี',
    grade_level: 'ป.4',
    classroom: 'KBW',
    teacher_name: 'อ.สมหญิง',
    project_name: 'โปรเจกต์สิ่งแวดล้อม',
    academic_term: '2568-2',
    month: 'พฤศจิกายน',
    com_score: 1,
    think_score: 2,
    problem_score: 2,
    life_score: 2,
    tech_score: 2,
    total_score: 9,
    overall_result: 'fail',
    notes: 'ต้องพัฒนาด้านการสื่อสาร'
  },
  {
    student_id: '65004',
    student_name: 'สมใจ มานะ',
    grade_level: 'ป.4',
    classroom: 'KBW',
    teacher_name: 'อ.สมหญิง',
    project_name: 'โปรเจกต์สิ่งแวดล้อม',
    academic_term: '2568-2',
    month: 'พฤศจิกายน',
    com_score: 2,
    think_score: 3,
    problem_score: 2,
    life_score: 3,
    tech_score: 2,
    total_score: 12,
    overall_result: 'pass',
    notes: ''
  },
  {
    student_id: '65005',
    student_name: 'สมพร พากเพียร',
    grade_level: 'ป.4',
    classroom: 'KBW',
    teacher_name: 'อ.สมหญิง',
    project_name: 'โปรเจกต์สิ่งแวดล้อม',
    academic_term: '2568-2',
    month: 'พฤศจิกายน',
    com_score: 3,
    think_score: 3,
    problem_score: 3,
    life_score: 3,
    tech_score: 3,
    total_score: 15,
    overall_result: 'excellent',
    notes: 'ทำงานได้ดีมากทุกด้าน'
  }
];

// Create workbook
const workbook = XLSX.utils.book_new();

// Create worksheet from data
const worksheet = XLSX.utils.json_to_sheet(sampleData);

// Set column widths
worksheet['!cols'] = [
  { wch: 12 }, // student_id
  { wch: 20 }, // student_name
  { wch: 12 }, // grade_level
  { wch: 10 }, // classroom
  { wch: 20 }, // teacher_name
  { wch: 30 }, // project_name
  { wch: 15 }, // academic_term
  { wch: 15 }, // month
  { wch: 10 }, // com_score
  { wch: 10 }, // think_score
  { wch: 12 }, // problem_score
  { wch: 10 }, // life_score
  { wch: 10 }, // tech_score
  { wch: 12 }, // total_score
  { wch: 15 }, // overall_result
  { wch: 30 }  // notes
];

// Add the worksheet with the required name "ATLAS Import"
XLSX.utils.book_append_sheet(workbook, worksheet, 'ATLAS Import');

// Create instruction sheet
const instructions = [
  ['คำแนะนำการใช้งาน PBL Assessment Import'],
  [''],
  ['1. ชื่อแท็บต้องเป็น "ATLAS Import" เท่านั้น'],
  ['2. คอลัมน์ที่จำเป็นต้องกรอก:'],
  ['   - student_id, student_name, grade_level, classroom'],
  ['   - teacher_name, project_name, academic_term, month'],
  ['   - com_score, think_score, problem_score, life_score, tech_score'],
  ['   - overall_result (excellent/pass/fail)'],
  [''],
  ['3. คะแนนสมรรถนะ (1-3):'],
  ['   - 1 = ปรับปรุง'],
  ['   - 2 = ดี'],
  ['   - 3 = ดีเยี่ยม'],
  [''],
  ['4. เกณฑ์สรุปผล:'],
  ['   - excellent: ไม่มีด้านใดได้ 1 และมีด้านที่ได้ 3 อย่างน้อย 3 ด้าน'],
  ['   - fail: มีด้านใดด้านหนึ่งได้ 1'],
  ['   - pass: ที่เหลือ'],
  [''],
  ['5. กรุณาลบแถวตัวอย่างออกก่อนกรอกข้อมูลจริง'],
  [''],
  ['โรงเรียนวรนาถวิทยากำแพงเพชร - ATLAS PBL Assessment']
];

const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
instructionSheet['!cols'] = [{ wch: 80 }];
XLSX.utils.book_append_sheet(workbook, instructionSheet, 'คำแนะนำ');

// Write file
const outputPath = join(__dirname, '..', 'public', 'PBL_Import_Template.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('✅ PBL Assessment Import Template created successfully!');
console.log(`📁 File location: ${outputPath}`);
console.log('');
console.log('📝 Template includes:');
console.log('   - "ATLAS Import" sheet with 5 sample students');
console.log('   - "คำแนะนำ" sheet with instructions in Thai');
console.log('');
console.log('🎯 Ready to use for testing the import feature!');
