/** อุปกรณ์ที่เลือกได้ในโหมดบริบทห้อง (Phase 3) — คีย์ตรงกับ snapshotEquipment ใน LessonPlanConfig */
export const SNAPSHOT_EQUIPMENT_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "whiteboard", label: "กระดานไว / กระดานดำ" },
  { id: "projector", label: "โปรเจกเตอร์ / จอแสดงผล" },
  { id: "manipulatives", label: "สื่อสัมผัส (แท่ง เศษส่วน ฯลฯ)" },
  { id: "computers", label: "คอมพิวเตอร์ / ห้องคอม" },
  { id: "tablets", label: "แท็บเล็ต" },
  { id: "limited", label: "อุปกรณ์จำกัด / ไม่มีห้องพิเศษ" },
];

export function defaultSnapshotEquipment(): Record<string, boolean> {
  const o: Record<string, boolean> = {};
  for (const { id } of SNAPSHOT_EQUIPMENT_OPTIONS) o[id] = false;
  return o;
}
