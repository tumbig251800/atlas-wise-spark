/**
 * WP-S0 Safety Containment regression tests for PlcBundleDialog.
 *
 * Guarantee: this PLC-save path must NOT bulk-dismiss the linked action items,
 * and the success message must not claim the case was closed. If someone
 * re-introduces useBulkDismissActionItems, the mocked dismiss spy would be
 * called and this test fails. (DB-enforced closure guard lands in WP6.)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const spies = vi.hoisted(() => ({
  saveMutate: vi.fn(async () => ({ id: "sess-1" })),
  dismissMutate: vi.fn(async () => {}),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast: vi.fn((_: any) => {}),
  downloadDocx: vi.fn(async () => {}),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" }, role: "director", loading: false }),
}));
vi.mock("@/hooks/usePlcSessions", () => ({
  usePlcSessions: () => ({ savePlcSession: { mutateAsync: spies.saveMutate, isPending: false } }),
  useTeacherList: () => ({ data: [] }),
}));
// If bulk dismiss is ever re-added to the component, this spy would fire.
vi.mock("@/hooks/useActionItems", () => ({
  useBulkDismissActionItems: () => ({ mutateAsync: spies.dismissMutate, isPending: false }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: spies.toast }) }));
vi.mock("@/lib/downloadPlcDocx", () => ({ downloadPlcDocx: spies.downloadDocx }));

import { PlcBundleDialog } from "@/components/action-board/PlcBundleDialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const openItem: any = {
  id: 1,
  status: "open",
  grade_level: "ป.4",
  classroom: "1",
  subject: "คณิตศาสตร์",
  metric_label: "คะแนนรวมต่ำ",
};

describe("PlcBundleDialog — WP-S0 safety containment", () => {
  beforeEach(() => {
    spies.saveMutate.mockClear();
    spies.dismissMutate.mockClear();
    spies.toast.mockClear();
    spies.downloadDocx.mockClear();
    cleanup();
  });

  it("saving a PLC bundle does not bulk-dismiss action items and does not claim closure", async () => {
    render(
      <PlcBundleDialog open teacherName="ครูผู้สอน" items={[openItem]} onClose={() => {}} />,
    );

    fireEvent.change(screen.getByPlaceholderText("เช่น แนวทางพัฒนาทักษะการอ่าน ป.4"), {
      target: { value: "หัวข้อทดสอบ" },
    });
    fireEvent.change(screen.getByPlaceholderText("อธิบายปัญหาจากข้อมูล ATLAS..."), {
      target: { value: "ปัญหาทดสอบ" },
    });

    fireEvent.click(screen.getByRole("button", { name: "บันทึก PLC" }));

    await waitFor(() => expect(spies.saveMutate).toHaveBeenCalledTimes(1));

    // Core invariant: no bulk dismiss of action items.
    expect(spies.dismissMutate).not.toHaveBeenCalled();

    // Success message must not claim the case was closed.
    const toastArg = spies.toast.mock.calls.at(-1)?.[0] as { description?: string } | undefined;
    expect(toastArg?.description ?? "").not.toContain("ปิด");
  });

  it("does not render a banner claiming the bundle will close cases", () => {
    render(
      <PlcBundleDialog open teacherName="ครูผู้สอน" items={[openItem]} onClose={() => {}} />,
    );
    expect(screen.queryByText(/ปิด\s*\d+\s*รายการ/)).toBeNull();
  });
});
