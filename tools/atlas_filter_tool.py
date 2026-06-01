#!/usr/bin/env python3
"""
Atlas Teaching Logs Filter Tool
กรองข้อมูล teaching logs ตามชื่อครูหรือเงื่อนไขที่กำหนด
"""

import sys
import re
from datetime import datetime
from pathlib import Path

def parse_log_entry(lines):
    """แยกข้อมูลแต่ละรายการออกมา"""
    entry = {}
    current_line = 0

    for line in lines:
        line = line.strip()
        if line.startswith('รายการที่'):
            entry['id'] = line
        elif line.startswith('วันที่สอน:'):
            entry['date'] = line.replace('วันที่สอน:', '').strip()
        elif line.startswith('วิชา:'):
            entry['subject'] = line.replace('วิชา:', '').strip()
        elif line.startswith('ระดับชั้น/ห้อง:'):
            entry['class'] = line.replace('ระดับชั้น/ห้อง:', '').strip()
        elif line.startswith('หน่วยการเรียนรู้:'):
            entry['unit'] = line.replace('หน่วยการเรียนรู้:', '').strip()
        elif line.startswith('หัวข้อ:'):
            entry['topic'] = line.replace('หัวข้อ:', '').strip()
        elif line.startswith('จำนวนนักเรียน:'):
            entry['students'] = line.replace('จำนวนนักเรียน:', '').strip()
        elif line.startswith('Mastery:'):
            entry['mastery'] = line.replace('Mastery:', '').strip()
        elif line.startswith('Gap:'):
            entry['gap'] = line.replace('Gap:', '').strip()

    return entry

def load_atlas_file(filepath):
    """อ่านไฟล์ Atlas และแยกเป็นรายการ"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # แยกส่วนหัวกับเนื้อหา
    lines = content.split('\n')
    header = []
    entries = []

    # หาส่วนหัว
    for i, line in enumerate(lines):
        if line.startswith('รายการที่ 1'):
            header = lines[:i]
            break

    # แยกแต่ละรายการด้วย separator
    entry_text = '\n'.join(lines[len(header):])
    entry_blocks = entry_text.split('------------------------------')

    for block in entry_blocks:
        if block.strip() and 'รายการที่' in block:
            entries.append(block.strip())

    return header, entries

def filter_by_criteria(entries, criteria):
    """กรองรายการตามเงื่อนไข"""
    filtered = []

    for entry in entries:
        lines = entry.split('\n')
        match = True

        # ตรวจสอบเงื่อนไขต่างๆ
        if 'teacher' in criteria:
            # กรองตามชื่อครู (ถ้ามีในข้อมูล)
            if criteria['teacher'] not in entry:
                match = False

        if 'subject' in criteria and match:
            # กรองตามวิชา
            subject_found = False
            for line in lines:
                if line.startswith('วิชา:') and criteria['subject'] in line:
                    subject_found = True
                    break
            if not subject_found:
                match = False

        if 'class' in criteria and match:
            # กรองตามระดับชั้น
            class_found = False
            for line in lines:
                if line.startswith('ระดับชั้น/ห้อง:') and criteria['class'] in line:
                    class_found = True
                    break
            if not class_found:
                match = False

        if 'date_from' in criteria and match:
            # กรองตามช่วงวันที่
            # TODO: implement date range filter
            pass

        if match:
            filtered.append(entry)

    return filtered

def save_filtered_file(header, entries, output_path):
    """บันทึกไฟล์ที่กรองแล้ว"""
    with open(output_path, 'w', encoding='utf-8') as f:
        # เขียนส่วนหัว (อัพเดทจำนวนรายการ)
        for i, line in enumerate(header):
            if line.startswith('จำนวนรายการ:'):
                f.write(f'จำนวนรายการ: {len(entries)}\n')
            else:
                f.write(line + '\n')

        # เขียนรายการที่กรองแล้ว
        for i, entry in enumerate(entries, 1):
            # อัพเดทหมายเลขรายการ
            entry_lines = entry.split('\n')
            entry_lines[0] = f'รายการที่ {i}'

            f.write('\n'.join(entry_lines))
            f.write('\n\n------------------------------\n')

    print(f'✅ บันทึกไฟล์สำเร็จ: {output_path}')
    print(f'📊 จำนวนรายการ: {len(entries)} รายการ')

def interactive_filter():
    """โหมดโต้ตอบสำหรับกรองข้อมูล"""
    print('=' * 60)
    print('🔍 Atlas Teaching Logs Filter Tool')
    print('=' * 60)

    # ถามไฟล์ input
    input_file = input('\n📁 ไฟล์ที่จะกรอง (ลาก-วางไฟล์มาที่นี่): ').strip().strip("'\"")

    if not Path(input_file).exists():
        print('❌ ไม่พบไฟล์ที่ระบุ')
        return

    # โหลดไฟล์
    print(f'\n📖 กำลังอ่านไฟล์...')
    header, entries = load_atlas_file(input_file)
    print(f'✅ พบ {len(entries)} รายการ')

    # ถามเงื่อนไขการกรอง
    print('\n🎯 ตั้งค่าการกรอง (กด Enter เพื่อข้าม)')
    print('-' * 60)

    criteria = {}

    subject = input('📚 กรองตามวิชา (เช่น "ภาษาอังกฤษ"): ').strip()
    if subject:
        criteria['subject'] = subject

    grade_class = input('🎓 กรองตามระดับชั้น (เช่น "ป.4"): ').strip()
    if grade_class:
        criteria['class'] = grade_class

    # กรองข้อมูล
    print(f'\n⚙️  กำลังกรองข้อมูล...')
    filtered_entries = filter_by_criteria(entries, criteria)

    print(f'✅ กรองเสร็จสิ้น: เหลือ {len(filtered_entries)} รายการ')

    # บันทึกไฟล์
    input_path = Path(input_file)
    output_file = input_path.parent / f'{input_path.stem}_filtered{input_path.suffix}'

    custom_output = input(f'\n💾 บันทึกที่ (Enter = {output_file}): ').strip().strip("'\"")
    if custom_output:
        output_file = custom_output

    save_filtered_file(header, filtered_entries, output_file)

    print('\n✨ เสร็จสิ้น!')

def main():
    """ฟังก์ชันหลัก"""
    if len(sys.argv) > 1:
        # โหมด command line
        input_file = sys.argv[1]
        header, entries = load_atlas_file(input_file)

        # กรองตามอาร์กิวเมนต์
        criteria = {}
        if len(sys.argv) > 2:
            criteria['subject'] = sys.argv[2]

        filtered_entries = filter_by_criteria(entries, criteria)

        output_file = Path(input_file).stem + '_filtered.txt'
        save_filtered_file(header, filtered_entries, output_file)
    else:
        # โหมดโต้ตอบ
        interactive_filter()

if __name__ == '__main__':
    main()
