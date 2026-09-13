import { describe, expect, it } from "vitest";
import * as app from "@/lib/issueTypeSuspension";
import * as edge from "../../../supabase/functions/_shared/issueTypeSuspension.ts";

describe("issue type suspension constants", () => {
  it("keeps the app and edge-function copies identical", () => {
    expect(edge.SUSPENDED_ISSUE_TYPES).toEqual(app.SUSPENDED_ISSUE_TYPES);
  });

  it("suspends UnitBlindSpot from 2026-09-13 and nothing else", () => {
    expect(Object.keys(app.SUSPENDED_ISSUE_TYPES)).toEqual(["UnitBlindSpot"]);
    expect(app.getIssueTypeSuspension("UnitBlindSpot")?.since).toBe("2026-09-13");
    for (const t of ["UnitAssessmentOverdue", "UnitLowScore", "RedZone", "MasteryDrop", "IntegrityFlag", "FlatScore"]) {
      expect(app.isSuspendedIssueType(t)).toBe(false);
    }
  });

  it("does not treat prototype keys or empty values as suspended", () => {
    expect(app.isSuspendedIssueType("toString")).toBe(false);
    expect(app.isSuspendedIssueType(null)).toBe(false);
    expect(app.isSuspendedIssueType(undefined)).toBe(false);
    expect(edge.isSuspendedIssueType("constructor")).toBe(false);
  });

  it("does not claim the rule can never produce cases again", () => {
    const text = JSON.stringify(app.SUSPENDED_ISSUE_TYPES);
    expect(text).toContain("ณ วันที่ตรวจสอบ");
    expect(text).not.toContain("จะไม่มีเคสใหม่");
  });

  it("labels only suspended types", () => {
    expect(app.withSuspensionLabel("UnitBlindSpot", "X")).toBe("X · ระงับแล้ว");
    expect(app.withSuspensionLabel("UnitAssessmentOverdue", "Y")).toBe("Y");
  });

  it("excludeSuspended keeps every other issue type", () => {
    const items = [
      { issue_type: "UnitBlindSpot" },
      { issue_type: "UnitAssessmentOverdue" },
      { issue_type: null },
    ];
    expect(app.excludeSuspended(items)).toEqual([{ issue_type: "UnitAssessmentOverdue" }, { issue_type: null }]);
  });
});

describe("MCP suspension notices", () => {
  it("builds a suspended notice for UnitBlindSpot only", () => {
    expect(edge.buildSuspensionNotice("UnitBlindSpot")).toMatchObject({
      issue_type: "UnitBlindSpot",
      rule_status: "suspended",
      suspended_since: "2026-09-13",
    });
    expect(edge.buildSuspensionNotice("UnitAssessmentOverdue")).toBeNull();
  });

  it("dedupes and ignores non-suspended types in mixed results", () => {
    const notices = edge.suspensionNoticesFor(["RedZone", "UnitBlindSpot", null, "UnitBlindSpot", "UnitAssessmentOverdue"]);
    expect(notices).toHaveLength(1);
    expect(notices[0].issue_type).toBe("UnitBlindSpot");
  });

  it("returns no notices for an empty result", () => {
    expect(edge.suspensionNoticesFor([])).toEqual([]);
  });
});
