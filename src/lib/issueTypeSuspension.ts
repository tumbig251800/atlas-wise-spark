export interface IssueTypeSuspension {
  since: string;
  sinceLabel: string;
  label: string;
  reason: string;
}

// Mirrored in supabase/functions/_shared/issueTypeSuspension.ts for the MCP
// server; a test asserts both copies stay identical.
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

export function excludeSuspended<T extends { issue_type: string | null }>(items: T[]): T[] {
  return items.filter((item) => !isSuspendedIssueType(item.issue_type));
}

export function withSuspensionLabel(issueType: string, label: string): string {
  const suspension = getIssueTypeSuspension(issueType);
  return suspension ? `${label} · ${suspension.label}` : label;
}
