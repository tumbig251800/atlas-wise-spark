/**
 * ATLAS Phase 4.1 — Number Extractor
 * Extracts all numeric values from Thai + English text
 * for post-generation validation against input context.
 */

export interface NumberWithContext {
  number: number;
  context: string;
}

export function extractNumbersFromText(text: string): number[] {
  return extractNumbersWithContext(text).map((n) => n.number);
}

export function extractNumbersWithContext(text: string): NumberWithContext[] {
  const results: NumberWithContext[] = [];

  const patterns: RegExp[] = [
    /(\d+(?:\.\d+)?)\s*%/g,
    /(?:ประมาณ|ราว|กว่า|เกือบ|เกิน|ต่ำกว่า|สูงกว่า)\s*(\d+(?:\.\d+)?)\s*%?/g,
    /\b(\d+)\s*\/\s*(\d+)\b/g,
    /(\d+)\s*(?:คน|คาบ|ชั้น|ห้อง|วิชา|ครู|นักเรียน|ข้อ|ครั้ง)/g,
    /(\d+)\s*[-–]\s*(\d+)/g,
    /(?:Mastery|คะแนน|เฉลี่ย|ร้อยละ|Growth)\s*[:=]?\s*(\d+(?:\.\d+)?)/gi,
    /\b(\d+\.\d+)\b/g,
    /\b(\d{2,})\b/g,
  ];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + match[0].length + 20);
      const context = text.slice(start, end).replace(/\n/g, " ");

      if (match[2] !== undefined && pattern.source.includes("\\/")) {
        const num = parseFloat(match[1]);
        const den = parseFloat(match[2]);
        if (den > 0) {
          results.push({ number: num, context });
          results.push({ number: den, context });
          results.push({ number: Math.round((num / den) * 100 * 10) / 10, context });
        }
      } else {
        const val = parseFloat(match[1]);
        if (!isNaN(val)) results.push({ number: val, context });
      }
    }
  }

  const seen = new Set<number>();
  return results.filter(({ number }) => {
    if (seen.has(number)) return false;
    seen.add(number);
    return true;
  });
}

/**
 * Normalize Mastery X/5 to percent for cross-comparison
 * e.g. 2.3 -> 46, 3.5 -> 70
 */
export function normalizeMasteryToPercent(values: number[]): number[] {
  const extra: number[] = [];
  for (const v of values) {
    if (v >= 1 && v <= 5 && v % 1 !== 0) {
      extra.push(Math.round((v / 5) * 100));
    }
  }
  return [...values, ...extra];
}
