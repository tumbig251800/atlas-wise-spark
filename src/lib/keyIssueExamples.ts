import type { GapValue } from "./gapOptions";

export interface KeyIssueExample {
  text: string;
}

export const KEY_ISSUE_EXAMPLES_BY_GAP: Record<GapValue, KeyIssueExample[]> = {
  "k-gap": [
    { text: "นักเรียนยังจำส่วนประกอบของพืชไม่ครบ ตอบสับใบกับลำต้น ต้องทบทวนภาพประกอบ" },
    { text: "นักเรียนยังไม่เข้าใจวิธีคูณตัวเลข 2 หลัก ต้องสอนซ้ำขั้นตอนการตั้งหลัก" },
    { text: "นักเรียนสับสนระหว่างประธานกับกริยา ต้องทบทวนโครงสร้างประโยคพื้นฐาน" },
  ],
  "p-gap": [
    { text: "นักเรียนเข้าใจกฎไวยากรณ์ แต่เขียนประโยคยังช้า ต้องฝึกเขียนซ้ำๆ" },
    { text: "นักเรียนรู้สูตร แต่คำนวณช้าและผิดบ่อย ต้องเพิ่มโจทย์ฝึก" },
    { text: "เด็กออกเสียงคำศัพท์ยังไม่ชัด ต้องฝึกออกเสียงตามครูช้าๆ" },
  ],
  // GapValue uses "a-gap" (label "A1-Gap") — see src/lib/gapOptions.ts.
  "a-gap": [
    { text: "นักเรียนหลายคนไม่ตั้งใจ คุยกันในห้อง ต้องปรับวิธีนำเสนอให้น่าสนใจ" },
    { text: "นักเรียนเขินอายไม่กล้าตอบคำถาม ต้องสร้างบรรยากาศให้กล้าแสดงออก" },
    { text: "เด็กบางคนทำงานเสร็จไม่ส่ง ขาดแรงจูงใจ ต้องคุยส่วนตัว" },
  ],
  "a2-gap": [
    { text: "นักเรียน A ทำร้ายเพื่อนในห้อง ส่งต่อครูแนะแนวและฝ่ายปกครองแล้ว" },
    { text: "นักเรียน B พูดถึงการทำร้ายตัวเอง แจ้งฝ่ายปกครองและผู้ปกครองทันที" },
    { text: "พบรอยแผลที่แขนนักเรียน C ประสานครูแนะแนวเพื่อพูดคุย" },
  ],
  "system-gap": [
    { text: "หนังสือเรียนยังไม่ครบทุกคน ใช้ใบงานแทนชั่วคราว แจ้งวิชาการแล้ว" },
    { text: "เวลาในคาบไม่พอ ต้องสอนต่อในคาบหน้า เนื้อหาเยอะเกินไป" },
    { text: "อินเทอร์เน็ตห้องเรียนไม่เสถียร ใช้สื่อ offline แทน" },
  ],
  success: [
    { text: "เด็กส่วนใหญ่ตอบคำถามได้ถูกต้อง เทคนิคใช้เพลงช่วยจำได้ผลดี" },
    { text: "ใช้เกมแข่งตอบคำถามทำให้เด็กมีส่วนร่วม 90% ของห้อง" },
    { text: "เด็กทำใบงานได้ทุกข้อ การใช้สื่อภาพประกอบทำให้เข้าใจง่าย" },
    { text: "นักเรียนสามารถอธิบายให้เพื่อนเข้าใจได้ แสดงว่าเข้าใจจริง" },
  ],
};

/** Pick the example bucket that matches the teacher's chosen gap.
 *  If no gap is selected yet (e.g. Step 2 reached before Step 3 was filled),
 *  fall back to "success" examples as a neutral default. */
export function getExamplesForGap(
  gapType: GapValue | null | undefined,
): KeyIssueExample[] {
  if (!gapType) return KEY_ISSUE_EXAMPLES_BY_GAP.success;
  return KEY_ISSUE_EXAMPLES_BY_GAP[gapType] ?? [];
}
