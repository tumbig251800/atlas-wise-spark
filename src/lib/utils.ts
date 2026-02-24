import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize classroom data corrupted by Excel auto-formatting.
 * e.g. "1-ม.ค." → "1", "2-ก.พ." → "2", "1-Jan" → "1", "ป.2/1" → "1"
 */
export function cleanClassroomData(value: string): string {
  if (!value) return value;
  const trimmed = value.trim();

  // Thai month patterns: "1-ม.ค.", "2-ก.พ.", "3-มี.ค." etc.
  const thaiMatch = trimmed.match(/^(\d+)-[ก-ฮ]/);
  if (thaiMatch) return thaiMatch[1];

  // English month patterns: "1-Jan", "2-Feb", "3-Mar" etc.
  const engMatch = trimmed.match(/^(\d+)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
  if (engMatch) return engMatch[1];

  // "ป.x/y" format → extract y (classroom number)
  const classMatch = trimmed.match(/^ป\.\d+\/(\d+)$/);
  if (classMatch) return classMatch[1];

  // "x/y" format → extract y (classroom number)
  const slashMatch = trimmed.match(/^\d+\/(\d+)$/);
  if (slashMatch) return slashMatch[1];

  // "ห้อง2", "ห้อง1" → "2", "1"
  const roomMatch = trimmed.match(/^ห้อง\s*(\d+)$/);
  if (roomMatch) return roomMatch[1];

  // Already a pure number or valid format
  return trimmed;
}
