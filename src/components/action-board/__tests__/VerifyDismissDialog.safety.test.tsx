/**
 * WP-S0.1 interim UI guard regression tests for the Verify path.
 *
 * Until WP6 adds a DB-enforced monitoring-result gate, a PLC Impact Loop case
 * (a classroom/student-outcome issue) must NOT be closable to "verified" from the
 * UI. This test pins:
 *   - the guard predicate (requiresMonitoringBeforeVerify)
 *   - that VerifyDismissDialog blocks the verify write for such cases
 *   - that dismiss and IntegrityFlag verify are NOT broken by the guard
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { requiresMonitoringBeforeVerify } from "@/hooks/useActionItems";

// Mirrors the input of useResolveActionItem's mutation (see useActionItems.ts).
type ResolveArg = {
  id: number;
  status: "verified" | "dismissed" | "resolved";
  note: string | null;
  userId: string;
  dueDate?: string;
};
type ToastArg = { title?: string; description?: string; variant?: string };

const spies = vi.hoisted(() => ({
  resolveMutate: vi.fn(async (_input: ResolveArg) => {}),
  toast: vi.fn((_arg: ToastArg) => {}),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, role: "director", loading: false }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: spies.toast }) }));
// Keep the real requiresMonitoringBeforeVerify; only replace the mutation hook.
vi.mock("@/hooks/useActionItems", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useActionItems")>();
  return {
    ...actual,
    useResolveActionItem: () => ({ mutateAsync: spies.resolveMutate, isPending: false }),
  };
});

import { VerifyDismissDialog } from "@/components/action-board/VerifyDismissDialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const item = (over: Record<string, unknown> = {}): any => ({
  id: 1,
  status: "resolved",
  issue_type: "MasteryDrop",
  teacher_name: "ครูทดสอบ",
  grade_level: "ป.4",
  classroom: "1",
  subject: "คณิตศาสตร์",
  metric_label: "คะแนนรวม",
  metric_value: null,
  ...over,
});

describe("WP-S0.1 requiresMonitoringBeforeVerify", () => {
  it("requires monitoring for classroom/student-outcome issues", () => {
    expect(requiresMonitoringBeforeVerify({ issue_type: "MasteryDrop" })).toBe(true);
    expect(requiresMonitoringBeforeVerify({ issue_type: "RedZone" })).toBe(true);
    expect(requiresMonitoringBeforeVerify({ issue_type: "UnitBlindSpot" })).toBe(true);
  });
  it("does NOT gate IntegrityFlag (data-quality fix keeps its own verify)", () => {
    expect(requiresMonitoringBeforeVerify({ issue_type: "IntegrityFlag" })).toBe(false);
  });
});

describe("VerifyDismissDialog — WP-S0.1 verify guard", () => {
  beforeEach(() => {
    spies.resolveMutate.mockClear();
    spies.toast.mockClear();
    cleanup();
  });

  it("blocks closing a PLC Impact Loop case to verified (no write) and warns the user", async () => {
    render(<VerifyDismissDialog open mode="verify" item={item({ issue_type: "MasteryDrop" })} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    // The verify write must never be issued.
    await waitFor(() => {
      const toastArg = spies.toast.mock.calls.at(-1)?.[0];
      expect(toastArg?.variant).toBe("destructive");
    });
    expect(spies.resolveMutate).not.toHaveBeenCalled();
  });

  it("still allows IntegrityFlag verify (data-quality fix is not gated)", async () => {
    render(<VerifyDismissDialog open mode="verify" item={item({ issue_type: "IntegrityFlag" })} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(spies.resolveMutate).toHaveBeenCalledTimes(1));
    expect(spies.resolveMutate.mock.calls[0][0]).toMatchObject({ status: "verified" });
  });

  it("does not break the dismiss flow for a mis-created / unrelated case", async () => {
    render(<VerifyDismissDialog open mode="dismiss" item={item({ issue_type: "MasteryDrop" })} onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText("เหตุผลที่ปิดรายการ..."), {
      target: { value: "สร้างผิด / ไม่เกี่ยวข้อง" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    await waitFor(() => expect(spies.resolveMutate).toHaveBeenCalledTimes(1));
    expect(spies.resolveMutate.mock.calls[0][0]).toMatchObject({ status: "dismissed" });
  });
});
