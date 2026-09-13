export interface IssueTypeSuspension {
  since: string;
  sinceLabel: string;
  label: string;
  reason: string;
}

// Mirrors src/lib/issueTypeSuspension.ts (Deno cannot import from src/); a test
// asserts both copies stay identical.
export const SUSPENDED_ISSUE_TYPES: Readonly<Record<string, IssueTypeSuspension>> = {
  UnitBlindSpot: {
    since: "2026-09-13",
    sinceLabel: "13 ก.ย. 2569",
    label: "ระงับแล้ว",
    reason:
      "ผู้อำนวยการยุติการติดตาม PLC รายนักเรียนจากการประเมินหลังหน่วยเดิม — WF-6 หยุดสร้างเคสอัตโนมัติแล้ว ณ วันที่ตรวจสอบ ไม่นับในยอดเคสที่ต้องดำเนินการ",
  },
};

export function getIssueTypeSuspension(issueType: string | null | undefined): IssueTypeSuspension | null {
  if (!issueType || !Object.prototype.hasOwnProperty.call(SUSPENDED_ISSUE_TYPES, issueType)) return null;
  return SUSPENDED_ISSUE_TYPES[issueType];
}

export function isSuspendedIssueType(issueType: string | null | undefined): boolean {
  return getIssueTypeSuspension(issueType) !== null;
}

export interface SuspensionNotice {
  issue_type: string;
  rule_status: "suspended";
  suspended_since: string;
  notice: string;
}

export function buildSuspensionNotice(issueType: string): SuspensionNotice | null {
  const suspension = getIssueTypeSuspension(issueType);
  if (!suspension) return null;
  return {
    issue_type: issueType,
    rule_status: "suspended",
    suspended_since: suspension.since,
    notice: `กฎ ${issueType} ${suspension.label}ตั้งแต่ ${suspension.sinceLabel}: ${suspension.reason} — ตัวเลขที่เกี่ยวข้องเป็นข้อมูลประกอบเท่านั้น ไม่ใช่รายการที่ต้องเปิดเคสหรือจัดคิว PLC`,
  };
}

export function suspensionNoticesFor(issueTypes: Iterable<string | null | undefined>): SuspensionNotice[] {
  const seen = new Set<string>();
  const notices: SuspensionNotice[] = [];
  for (const issueType of issueTypes) {
    if (!issueType || seen.has(issueType)) continue;
    seen.add(issueType);
    const notice = buildSuspensionNotice(issueType);
    if (notice) notices.push(notice);
  }
  return notices;
}
