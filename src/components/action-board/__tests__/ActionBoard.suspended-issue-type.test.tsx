/**
 * UnitBlindSpot was suspended on 2026-09-13. Production currently has zero
 * open/watching UnitBlindSpot rows, so these fixtures simulate open ones to prove
 * suspended types never inflate workload KPIs while other types are unchanged.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, renderHook, within } from "@testing-library/react";
import React from "react";

// Any write attempt fails the test: this suite must stay read-only.
const supa = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  for (const m of ["select", "eq", "in", "order", "contains", "not", "gte", "limit", "single", "maybeSingle"]) {
    b[m] = () => b;
  }
  for (const m of ["insert", "update", "upsert", "delete", "rpc"]) {
    b[m] = () => {
      throw new Error(`write attempted in read-only test: ${m}`);
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  b.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
  return {
    supabase: {
      from: () => b,
      rpc: b.rpc,
      functions: {
        invoke: () => {
          throw new Error("edge function invoked in read-only test");
        },
      },
    },
  };
});
vi.mock("@/lib/atlasSupabase", () => ({ supabase: supa.supabase }));

const fixture = vi.hoisted(() => ({ items: [] as unknown[] }));
vi.mock("@/hooks/useActionItems", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useActionItems")>();
  return { ...actual, useActionItems: () => ({ data: fixture.items, isLoading: false, error: null }) };
});

import type { ActionItem } from "@/hooks/useActionItems";
import { ActionStatsBar } from "@/components/action-board/ActionStatsBar";
import { ActionFilters } from "@/components/action-board/ActionFilters";
import { IssueTypeBadge } from "@/components/action-board/StatusBadge";
import { computeFilterCounts, isHistoryStatus } from "@/pages/actionBoardStatus";
import { usePlcQueue } from "@/hooks/usePlcQueue";

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let nextId = 1;
function item(overrides: Partial<ActionItem>): ActionItem {
  return {
    id: nextId++,
    issue_type: "RedZone",
    status: "open",
    severity: "high",
    due_date: isoDate(5),
    teacher_id: "t-1",
    teacher_name: "ครูจำลอง",
    grade_level: "ป.4",
    classroom: "1",
    subject: "คณิตศาสตร์",
    metric_value: 40,
    ...overrides,
  } as ActionItem;
}

const blindSpotOpen = () => [
  item({ issue_type: "UnitBlindSpot", status: "open", due_date: isoDate(-3), severity: "high" }),
  item({ issue_type: "UnitBlindSpot", status: "open", due_date: isoDate(4), severity: "critical" }),
];
const assessmentOverdueOpen = () =>
  Array.from({ length: 10 }, (_, i) =>
    item({ issue_type: "UnitAssessmentOverdue", status: "open", due_date: isoDate(i < 3 ? -2 : 6), severity: "medium" }),
  );

function renderStats(items: ActionItem[]) {
  return render(<ActionStatsBar items={items} />);
}

describe("Case 1 — simulated open UnitBlindSpot is not counted in KPIs", () => {
  const uao = assessmentOverdueOpen();
  const items = [...blindSpotOpen(), ...uao];

  it("filter-tab counts ignore suspended open/overdue items", () => {
    const counts = computeFilterCounts(items);
    expect(counts.open).toBe(10);
    expect(counts.overdue).toBe(3);
    expect(counts.all).toBe(12);
  });

  it("stats bar backlog and overdue ignore suspended items and say so", () => {
    renderStats(items);
    expect(screen.getByText("ค้างอยู่ 10 รายการ")).toBeInTheDocument();
    expect(screen.getByText("⚠ เกินกำหนด 3")).toBeInTheDocument();
    expect(screen.getByText("ไม่รวมประเภทที่ระงับแล้ว 2 รายการ")).toBeInTheDocument();
  });

  it("suspended items never generate a PLC queue group", () => {
    fixture.items = blindSpotOpen();
    const { result } = renderHook(() => usePlcQueue());
    expect(result.current.queueGroups).toEqual([]);
  });
});

describe("Case 2 — dismissed UnitBlindSpot stays viewable", () => {
  const dismissed = [
    item({ issue_type: "UnitBlindSpot", status: "dismissed" }),
    item({ issue_type: "UnitBlindSpot", status: "dismissed" }),
  ];

  it("remains in history and in the closed-tab count", () => {
    expect(dismissed.every((i) => isHistoryStatus(i.status))).toBe(true);
    expect(computeFilterCounts(dismissed)).toMatchObject({ all: 2, dismissed: 2, open: 0, overdue: 0 });
  });

  it("badge marks the type as suspended and names it per-student", () => {
    render(<IssueTypeBadge type="UnitBlindSpot" />);
    expect(screen.getByText("📦 คะแนนหลังหน่วยต่ำรายนักเรียน · ระงับแล้ว")).toBeInTheDocument();
  });
});

describe("Case 3 — UnitAssessmentOverdue behaves exactly as before", () => {
  it("counts are identical with or without suspended items present", () => {
    const uao = assessmentOverdueOpen();
    const alone = computeFilterCounts(uao);
    const mixed = computeFilterCounts([...uao, ...blindSpotOpen()]);
    expect(mixed.open).toBe(alone.open);
    expect(mixed.overdue).toBe(alone.overdue);
    expect(alone).toMatchObject({ all: 10, open: 10, overdue: 3 });
  });

  it("badge is not labelled suspended", () => {
    render(<IssueTypeBadge type="UnitAssessmentOverdue" />);
    const badge = screen.getByText("⏳ ค้างประเมินหลังหน่วย");
    expect(badge.textContent).not.toContain("ระงับ");
  });
});

describe("Case 4 — mixed issue types: suspension applies to UnitBlindSpot only", () => {
  const mixed = () => [
    ...blindSpotOpen(),
    item({ issue_type: "RedZone", status: "open", due_date: isoDate(-1), severity: "critical", grade_level: "ป.2" }),
    item({ issue_type: "MasteryDrop", status: "watching", grade_level: "ป.5" }),
    item({ issue_type: "IntegrityFlag", status: "open" }),
    item({ issue_type: "UnitAssessmentOverdue", status: "open" }),
  ];

  it("PLC queue keeps other types and drops UnitBlindSpot", () => {
    fixture.items = mixed();
    const { result } = renderHook(() => usePlcQueue());
    const queued = result.current.queueGroups.flatMap((g) => g.items.map((i) => i.issue_type));
    expect(queued).not.toContain("UnitBlindSpot");
    expect(queued).toEqual(expect.arrayContaining(["RedZone", "MasteryDrop", "UnitAssessmentOverdue"]));
    expect(result.current.integrityFlags).toHaveLength(1);
  });

  it("only the UnitBlindSpot filter tab carries the suspended label", () => {
    const items = mixed();
    const issueCounts = { all: items.length, RedZone: 1, MasteryDrop: 1, UnitBlindSpot: 2, IntegrityFlag: 1, FlatScore: 0, UnitAssessmentOverdue: 1 };
    render(
      <ActionFilters
        search=""
        onSearchChange={vi.fn()}
        filter="all"
        onFilterChange={vi.fn()}
        counts={computeFilterCounts(items)}
        issueType="all"
        onIssueTypeChange={vi.fn()}
        issueCounts={issueCounts}
      />,
    );
    const suspendedTabs = screen.getAllByRole("tab").filter((t) => t.textContent?.includes("ระงับแล้ว"));
    expect(suspendedTabs).toHaveLength(1);
    expect(within(suspendedTabs[0]).getByText(/หลังหน่วยรายนักเรียน/)).toBeInTheDocument();
  });

  it("stats bar counts every non-suspended active type", () => {
    renderStats(mixed());
    expect(screen.getByText("ค้างอยู่ 4 รายการ")).toBeInTheDocument();
    expect(screen.getByText("⚠ เกินกำหนด 1")).toBeInTheDocument();
  });
});

describe("Case 5 — empty data", () => {
  it("renders without crashing and shows no suspension caption", () => {
    renderStats([]);
    expect(screen.getByText("ค้างอยู่ 0 รายการ")).toBeInTheDocument();
    expect(screen.queryByText(/ไม่รวมประเภทที่ระงับแล้ว/)).toBeNull();
    expect(computeFilterCounts([])).toEqual({ all: 0, overdue: 0, open: 0, verified: 0, dismissed: 0 });
  });

  it("PLC queue is empty", () => {
    fixture.items = [];
    const { result } = renderHook(() => usePlcQueue());
    expect(result.current.queueGroups).toEqual([]);
    expect(result.current.integrityFlags).toEqual([]);
  });
});
