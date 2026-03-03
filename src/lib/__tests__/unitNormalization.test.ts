import { describe, it, expect } from "vitest";
import {
  extractUnitNumber,
  toUnitKey,
  normalizeUnit,
  sortByUnitKey,
} from "../unitNormalization";

describe("extractUnitNumber", () => {
  it("extracts from Thai: หน่วยที่ 1", () => {
    expect(extractUnitNumber("หน่วยที่ 1")).toBe(1);
  });

  it("extracts from Thai: หน่วยที่1 (no space)", () => {
    expect(extractUnitNumber("หน่วยที่1")).toBe(1);
  });

  it("extracts from Thai: หน่วย 1", () => {
    expect(extractUnitNumber("หน่วย 1")).toBe(1);
  });

  it("extracts from Thai: หน่วย 10", () => {
    expect(extractUnitNumber("หน่วย 10")).toBe(10);
  });

  it("extracts from English: Unit 1", () => {
    expect(extractUnitNumber("Unit 1")).toBe(1);
  });

  it("extracts from English: unit 1 (lowercase)", () => {
    expect(extractUnitNumber("unit 1")).toBe(1);
  });

  it("extracts from English: Unit1 (no space)", () => {
    expect(extractUnitNumber("Unit1")).toBe(1);
  });

  it("extracts from Thai: หน่วยการเรียนรู้ที่ 17", () => {
    expect(extractUnitNumber("หน่วยการเรียนรู้ที่ 17")).toBe(17);
  });

  it("extracts from Thai: หน่วยการเรียนรู้ 18 การเขียน", () => {
    expect(extractUnitNumber("หน่วยการเรียนรู้ 18 การเขียน")).toBe(18);
  });

  it("extracts from bare number at start", () => {
    expect(extractUnitNumber("1. บทนำ")).toBe(1);
  });

  it("returns null for empty string", () => {
    expect(extractUnitNumber("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(extractUnitNumber(null)).toBeNull();
  });

  it("returns null for text without number", () => {
    expect(extractUnitNumber("บทนำ")).toBeNull();
  });
});

describe("toUnitKey", () => {
  it("converts number to unit-{n}", () => {
    expect(toUnitKey(1)).toBe("unit-1");
    expect(toUnitKey(10)).toBe("unit-10");
  });
});

describe("normalizeUnit", () => {
  it("normalizes Thai หน่วยที่ 1", () => {
    const r = normalizeUnit("หน่วยที่ 1");
    expect(r).toEqual({ unitKey: "unit-1", displayName: "หน่วยที่ 1" });
  });

  it("normalizes English Unit 1", () => {
    const r = normalizeUnit("Unit 1");
    expect(r).toEqual({ unitKey: "unit-1", displayName: "Unit 1" });
  });

  it("returns null for empty or unparseable", () => {
    expect(normalizeUnit(null)).toBeNull();
    expect(normalizeUnit("")).toBeNull();
    expect(normalizeUnit("บทนำ")).toBeNull();
  });

  it("uses display name from input when available", () => {
    const r = normalizeUnit("หน่วยที่ 3 การบวก");
    expect(r?.unitKey).toBe("unit-3");
    expect(r?.displayName).toBe("หน่วยที่ 3 การบวก");
  });
});

describe("sortByUnitKey", () => {
  it("sorts unit keys numerically", () => {
    const keys = ["unit-10", "unit-2", "unit-1"];
    expect(sortByUnitKey(keys)).toEqual(["unit-1", "unit-2", "unit-10"]);
  });

  it("handles single key", () => {
    expect(sortByUnitKey(["unit-1"])).toEqual(["unit-1"]);
  });

  it("handles empty array", () => {
    expect(sortByUnitKey([])).toEqual([]);
  });
});
