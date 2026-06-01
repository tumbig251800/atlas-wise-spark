export interface PlcSession {
  id: string;
  session_date: string;
  duration_minutes: number | null;
  plc_type: 'subject' | 'grade_band';
  grade_band: 'ป.1-3' | 'ป.4-6' | 'ทั้งโรงเรียน' | null;
  subject: string | null;
  facilitator_name: string;
  members: { teacher_id: string; teacher_name: string }[];
  topic: string;
  problem_statement: string;
  root_cause: string;
  approach: string;
  action_steps: string;
  outcome_type: 'resolved' | 'need_supervision' | 'continue_plc';
  next_plc_date: string | null;
  linked_action_item_ids: number[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const PLC_OUTCOME_LABELS: Record<PlcSession['outcome_type'], string> = {
  resolved: 'แก้ไขได้แล้ว — ปิดเคส',
  need_supervision: 'ยังไม่พอ — ต้องนิเทศต่อ',
  continue_plc: 'ทำ PLC ต่อในครั้งหน้า',
};

export const GRADE_BANDS = ['ป.1-3', 'ป.4-6', 'ทั้งโรงเรียน'] as const;

export interface PlcPlan {
  plan_name: string;
  topic: string;
  rationale: string;
  members: { teacher_id: string; teacher_name: string }[];
  covered_item_ids: number[];
  coverage_percent: number;
  plc_type: 'subject' | 'grade_band' | 'cross';
  grade_band?: string;
  subject?: string;
  problem_statement: string;
  root_cause: string;
  approach: string;
}
