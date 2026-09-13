import type { ActionItem } from "@/hooks/useActionItems";
import { daysRemaining } from "@/hooks/useActionItems";
import type { ActionFilterChip } from "@/components/action-board/ActionFilters";
import { isSuspendedIssueType } from "@/lib/issueTypeSuspension";

// Case-status classification for the Action Board (WP-S0.2).
//
// "resolved" is an ACTIVE, waiting-for-monitoring state: the teacher marked the
// case done, but it cannot be closed until a monitoring result confirms it.
// Only "verified" and "dismissed" are closed (history) states. These two helpers
// are mutually exclusive and are the single source of truth for the
// queue-vs-history split rendered in ActionBoard.
export function isActiveQueueStatus(status: string | null | undefined): boolean {
  return status === "open" || status === "watching" || status === "resolved";
}

export function isHistoryStatus(status: string | null | undefined): boolean {
  return status === "verified" || status === "dismissed";
}

type FilterableItem = Pick<ActionItem, "status" | "due_date" | "issue_type">;

export function matchesFilter(item: FilterableItem, filter: ActionFilterChip): boolean {
  switch (filter) {
    case "all":
      return true;
    case "overdue": {
      if (item.status !== "open" && item.status !== "resolved") return false;
      const d = daysRemaining(item.due_date);
      return d !== null && d <= 0;
    }
    case "open":
      return item.status === "open" || item.status === "resolved";
    case "verified":
      return item.status === "verified";
    case "dismissed":
      return item.status === "dismissed";
  }
}

// "open" and "overdue" are workload KPIs, so suspended issue types are left out;
// "all" / closed tabs still count them so their history stays reachable.
export function computeFilterCounts(items: FilterableItem[]): Record<ActionFilterChip, number> {
  const workload = items.filter((i) => !isSuspendedIssueType(i.issue_type));
  return {
    all: items.length,
    overdue: workload.filter((i) => matchesFilter(i, "overdue")).length,
    open: workload.filter((i) => matchesFilter(i, "open")).length,
    verified: items.filter((i) => matchesFilter(i, "verified")).length,
    dismissed: items.filter((i) => matchesFilter(i, "dismissed")).length,
  };
}
