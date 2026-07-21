import { describe, it, expect, vi } from "vitest";
import {
  normalizeSubject,
  resolveSubjectForImport,
  getSubjectsForGrade,
  SUBJECT_ALIAS_MAP,
} from "../subjectNormalization";

const SOURCE = "การอ่านและการเขียนภาษาอังกฤษ";
const TARGET = "การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ";

describe("normalizeSubject", () => {
  it("keeps a canonical subject as-is (status canonical)", () => {
    const r = normalizeSubject("ภาษาอังกฤษ");
    expect(r).toEqual({
      subject: "ภาษาอังกฤษ",
      status: "canonical",
      original: "ภาษาอังกฤษ",
    });
  });

  it("recognizes the canonical ป.1-3 English subject (the TARGET)", () => {
    const r = normalizeSubject(TARGET);
    expect(r.status).toBe("canonical");
    expect(r.subject).toBe(TARGET);
  });

  it("maps a known alias (short → long) and returns the canonical name", () => {
    const r = normalizeSubject(SOURCE);
    expect(r.status).toBe("aliased");
    expect(r.subject).toBe(TARGET);
    expect(r.original).toBe(SOURCE);
  });

  it("returns raw + status unknown for an unrecognized subject (no guessing)", () => {
    const r = normalizeSubject("วิชาลึกลับที่ไม่รู้จัก");
    expect(r).toEqual({
      subject: "วิชาลึกลับที่ไม่รู้จัก",
      status: "unknown",
      original: "วิชาลึกลับที่ไม่รู้จัก",
    });
  });

  it("trims leading/trailing whitespace before matching (canonical)", () => {
    const r = normalizeSubject("  ภาษาอังกฤษ  ");
    expect(r.status).toBe("canonical");
    expect(r.subject).toBe("ภาษาอังกฤษ");
    expect(r.original).toBe("  ภาษาอังกฤษ  ");
  });

  it("collapses inner whitespace before matching an alias", () => {
    const r = normalizeSubject(`  ${SOURCE}  `);
    expect(r.status).toBe("aliased");
    expect(r.subject).toBe(TARGET);
  });

  it("treats empty / whitespace-only input as unknown", () => {
    expect(normalizeSubject("").status).toBe("unknown");
    expect(normalizeSubject("   ").status).toBe("unknown");
  });

  it("uses gradeLevel hint but still resolves canonical across grades", () => {
    // ป.1-3 competency-based Thai subject
    expect(normalizeSubject("การอ่านและการเขียนเพื่อการสื่อสาร", "ป.1").status).toBe(
      "canonical",
    );
    // ป.4-6 subject still recognized even without a matching gradeLevel
    expect(normalizeSubject("ภาษาไทย", "ป.1").status).toBe("canonical");
  });

  it("does NOT auto-map KBW variants (kept out of the alias map)", () => {
    expect(SUBJECT_ALIAS_MAP["ภาษาอังกฤษเสริม (KBW)"]).toBeUndefined();
    expect(SUBJECT_ALIAS_MAP["ภาษาอังกฤษ KBW"]).toBeUndefined();
    // 'ภาษาอังกฤษเสริม (KBW)' ไม่ได้อยู่ใน canonical list → unknown (ไม่ auto-map)
    expect(normalizeSubject("ภาษาอังกฤษเสริม (KBW)").status).toBe("unknown");
  });
});

describe("resolveSubjectForImport", () => {
  it("aliased → converts silently (no user warning) and logs", () => {
    const warnings: string[] = [];
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const subject = resolveSubjectForImport(SOURCE, "ป.1", warnings);
    expect(subject).toBe(TARGET);
    expect(warnings).toHaveLength(0);
    expect(infoSpy).toHaveBeenCalledOnce();
    infoSpy.mockRestore();
  });

  it("unknown → pushes a validation warning for the teacher", () => {
    const warnings: string[] = [];
    const subject = resolveSubjectForImport("วิชาแปลกๆ", "ป.2", warnings);
    expect(subject).toBe("วิชาแปลกๆ");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("วิชาแปลกๆ");
  });

  it("canonical → no warning, returns the name unchanged", () => {
    const warnings: string[] = [];
    const subject = resolveSubjectForImport("ภาษาอังกฤษ", "ป.5", warnings);
    expect(subject).toBe("ภาษาอังกฤษ");
    expect(warnings).toHaveLength(0);
  });
});

describe("getSubjectsForGrade", () => {
  it("gives ป.1-3 the competency-based lower-primary subjects", () => {
    const subjects = getSubjectsForGrade("ป.1");
    expect(subjects).toContain("การอ่านและการเขียนเพื่อการสื่อสาร");
    expect(subjects).not.toContain("ภาษาไทย");
  });

  it("gives ป.4-6 the original upper-primary subjects", () => {
    const subjects = getSubjectsForGrade("ป.4");
    expect(subjects).toContain("ภาษาไทย");
    expect(subjects).not.toContain("การอ่านและการเขียนเพื่อการสื่อสาร");
  });
});
