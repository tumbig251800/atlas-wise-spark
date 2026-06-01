#!/usr/bin/env python3
"""
Atlas Smart Filter - วิเคราะห์และแยกไฟล์ teaching logs อัตโนมัติ
"""

import sys
from pathlib import Path
from collections import defaultdict
import json

def analyze_patterns(entries):
    """วิเคราะห์รูปแบบในข้อมูลเพื่อแยกครู"""
    patterns = {
        'subjects': defaultdict(int),
        'classes': defaultdict(int),
        'student_counts': defaultdict(int),
        'teaching_styles': []
    }

    for entry in entries:
        lines = entry.split('\n')
        for line in lines:
            if line.startswith('วิชา:'):
                subject = line.replace('วิชา:', '').strip()
                patterns['subjects'][subject] += 1
            elif line.startswith('ระดับชั้น/ห้อง:'):
                class_info = line.replace('ระดับชั้น/ห้อง:', '').strip()
                patterns['classes'][class_info] += 1
            elif line.startswith('จำนวนนักเรียน:'):
                students = line.replace('จำนวนนักเรียน:', '').strip()
                patterns['student_counts'][students] += 1

    return patterns

def detect_teacher_groups(entries):
    """ตรวจจับกลุ่มของครูต่างๆ จากรูปแบบการสอน"""
    teacher_groups = []

    # กลุ่มที่ 1: ครูที่สอน ป.4 จำนวน 17 คน (น่าจะเป็นครูปวีณา)
    group1 = []
    # กลุ่มที่ 2: ครูที่สอน ป.1 จำนวน 14 คน
    group2 = []
    # กลุ่มที่ 3: ครูที่สอน ป.1 จำนวน 1 คน (สอนเสริม)
    group3 = []

    for entry in entries:
        # วิเคราะห์แต่ละรายการ
        is_p4_17 = False
        is_p1_14 = False
        is_p1_1 = False

        lines = entry.split('\n')
        for line in lines:
            if 'ป.4 / KBW' in line and 'จำนวนนักเรียน: 17' in entry:
                is_p4_17 = True
            elif 'ป.1 / KBW' in line and 'จำนวนนักเรียน: 14' in entry:
                is_p1_14 = True
            elif 'ป.1 / KBW' in line and 'จำนวนนักเรียน: 1' in entry:
                is_p1_1 = True

        if is_p4_17:
            group1.append(entry)
        elif is_p1_14:
            group2.append(entry)
        elif is_p1_1:
            group3.append(entry)

    return {
        'ครู ป.4 (17 คน) - น่าจะเป็นครูปวีณา': group1,
        'ครู ป.1 (14 คน)': group2,
        'ครู ป.1 สอนเสริม (1 คน)': group3
    }

def load_atlas_file(filepath):
    """อ่านไฟล์และแยกรายการ"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    header = []

    # หาส่วนหัว
    for i, line in enumerate(lines):
        if line.startswith('รายการที่ 1'):
            header = lines[:i]
            break

    # แยกรายการ
    entry_text = '\n'.join(lines[len(header):])
    entry_blocks = entry_text.split('------------------------------')

    entries = []
    for block in entry_blocks:
        if block.strip() and 'รายการที่' in block:
            entries.append(block.strip())

    return header, entries

def save_group_file(header, entries, output_path, group_name):
    """บันทึกไฟล์แยกตามกลุ่ม"""
    with open(output_path, 'w', encoding='utf-8') as f:
        # เขียนส่วนหัว
        for i, line in enumerate(header):
            if line.startswith('จำนวนรายการ:'):
                f.write(f'จำนวนรายการ: {len(entries)}\n')
            elif line.startswith('ผู้ใช้:'):
                f.write(f'{line} (กรอง: {group_name})\n')
            else:
                f.write(line + '\n')

        # เขียนรายการ
        for i, entry in enumerate(entries, 1):
            entry_lines = entry.split('\n')
            entry_lines[0] = f'รายการที่ {i}'
            f.write('\n'.join(entry_lines))
            f.write('\n\n------------------------------\n')

def main():
    print('=' * 70)
    print('🧠 Atlas Smart Filter - วิเคราะห์และแยกครูอัตโนมัติ')
    print('=' * 70)

    if len(sys.argv) < 2:
        input_file = input('\n📁 ไฟล์ที่จะวิเคราะห์: ').strip().strip("'\"")
    else:
        input_file = sys.argv[1]

    if not Path(input_file).exists():
        print('❌ ไม่พบไฟล์')
        return

    # โหลดและวิเคราะห์
    print(f'\n📖 กำลังอ่านไฟล์...')
    header, entries = load_atlas_file(input_file)
    print(f'✅ พบทั้งหมด {len(entries)} รายการ')

    # วิเคราะห์รูปแบบ
    print(f'\n🔍 กำลังวิเคราะห์รูปแบบ...')
    patterns = analyze_patterns(entries)

    print('\n📊 สรุปข้อมูลในไฟล์:')
    print('-' * 70)
    print('\n📚 วิชาที่พบ:')
    for subject, count in sorted(patterns['subjects'].items(), key=lambda x: x[1], reverse=True):
        print(f'  • {subject}: {count} ครั้ง')

    print('\n🎓 ระดับชั้นที่พบ:')
    for cls, count in sorted(patterns['classes'].items(), key=lambda x: x[1], reverse=True):
        print(f'  • {cls}: {count} ครั้ง')

    print('\n👥 จำนวนนักเรียนที่พบ:')
    for students, count in sorted(patterns['student_counts'].items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0, reverse=True):
        print(f'  • {students} คน: {count} ครั้ง')

    # แยกกลุ่มครู
    print(f'\n🎯 กำลังแยกกลุ่มครู...')
    teacher_groups = detect_teacher_groups(entries)

    print('\n✅ ผลการแยกกลุ่ม:')
    print('-' * 70)
    for group_name, group_entries in teacher_groups.items():
        if group_entries:
            print(f'  📌 {group_name}: {len(group_entries)} รายการ')

    # ถามว่าจะบันทึกแยกไหม
    print('\n💾 ต้องการบันทึกแยกเป็นไฟล์หรือไม่?')
    save_choice = input('   (Y = ใช่, N = ไม่): ').strip().upper()

    if save_choice == 'Y':
        input_path = Path(input_file)
        output_dir = input_path.parent

        for group_name, group_entries in teacher_groups.items():
            if group_entries:
                # สร้างชื่อไฟล์
                safe_name = group_name.replace('/', '-').replace(' ', '_')
                output_file = output_dir / f'{input_path.stem}_{safe_name}.txt'

                save_group_file(header, group_entries, output_file, group_name)
                print(f'  ✅ {output_file.name}')

        print(f'\n✨ เสร็จสิ้น! ไฟล์ถูกบันทึกที่: {output_dir}')
    else:
        print('\n✨ เสร็จสิ้น!')

if __name__ == '__main__':
    main()
