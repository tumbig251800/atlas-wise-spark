// Supervision Visit Record (บันทึกการนิเทศ)
// NOTE: action_item_id is `number` (not string) because action_plan_items.id
// is a bigint identity column, not a uuid.
export interface NidetVisit {
  id: string
  action_item_id: number
  visit_date: string
  supervisor_id: string | null
  supervisor_name: string
  strengths: string
  improvements: string
  recommendations: string
  follow_up_date: string | null
  follow_up_method: string
  rubric_activity_design: number | null
  rubric_questioning: number | null
  rubric_media_tech: number | null
  rubric_individual_care: number | null
  rubric_collaborative: number | null
  rubric_formative_assess: number | null
  rubric_feedback: number | null
  rubric_classroom_climate: number | null
  created_at: string
  updated_at: string
}

export type NidetVisitInsert = Omit<NidetVisit, 'id' | 'created_at' | 'updated_at'>

export const RUBRIC_DIMENSIONS = [
  { key: 'rubric_activity_design', label: 'การออกแบบกิจกรรม (K/P/A)' },
  { key: 'rubric_questioning', label: 'การใช้คำถามกระตุ้นความคิด' },
  { key: 'rubric_media_tech', label: 'การใช้สื่อและเทคโนโลยี' },
  { key: 'rubric_individual_care', label: 'การดูแลผู้เรียนรายบุคคล' },
  { key: 'rubric_collaborative', label: 'การจัดกิจกรรมร่วมมือ (กลุ่ม)' },
  { key: 'rubric_formative_assess', label: 'การตรวจสอบความเข้าใจระหว่างเรียน' },
  { key: 'rubric_feedback', label: 'การให้ feedback แก่ผู้เรียน' },
  { key: 'rubric_classroom_climate', label: 'บรรยากาศชั้นเรียน' },
] as const

export type RubricKey = typeof RUBRIC_DIMENSIONS[number]['key']
