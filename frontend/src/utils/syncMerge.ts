import type { BudgetRecord } from "@/types";

export type PulledRecordDecision = "apply" | "keep" | "delete";

/** Decide whether a delta-pulled server record may replace this user's local copy. */
export function decidePulledRecord(
  local: BudgetRecord | null | undefined,
  server: Pick<BudgetRecord, "updatedAt" | "isDeleted">,
): PulledRecordDecision {
  if (server.isDeleted)
    return local?.syncStatus === "pending" ? "keep" : "delete";
  if (!local || local.syncStatus === "synced") return "apply";
  if (local.syncStatus === "pending") return "keep";
  return server.updatedAt > local.updatedAt ? "apply" : "keep";
}
