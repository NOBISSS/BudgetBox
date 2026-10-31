import { describe, expect, it } from "vitest";
import { decidePulledRecord } from "./syncMerge";
import type { BudgetRecord } from "@/types";

const local: BudgetRecord = {
  id: "2025-01",
  userId: "user-1",
  month: 1,
  year: 2025,
  income: 1000,
  bills: 100,
  food: 100,
  transport: 0,
  subscriptions: 0,
  miscellaneous: 0,
  syncStatus: "pending",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("delta pull merge decision", () => {
  it("applies a new or synced record", () => {
    expect(decidePulledRecord(undefined, { updatedAt: local.updatedAt, isDeleted: false })).toBe("apply");
    expect(decidePulledRecord({ ...local, syncStatus: "synced" }, { updatedAt: local.updatedAt, isDeleted: false })).toBe("apply");
  });

  it("keeps pending edits and only replaces a newer non-pending copy", () => {
    expect(decidePulledRecord(local, { updatedAt: "2025-01-02T00:00:00.000Z", isDeleted: false })).toBe("keep");
    expect(decidePulledRecord({ ...local, syncStatus: "local-only" }, { updatedAt: "2025-01-02T00:00:00.000Z", isDeleted: false })).toBe("apply");
    expect(decidePulledRecord({ ...local, syncStatus: "local-only" }, { updatedAt: local.updatedAt, isDeleted: false })).toBe("keep");
  });

  it("deletes confirmed records but preserves a pending local edit", () => {
    expect(decidePulledRecord({ ...local, syncStatus: "synced" }, { updatedAt: local.updatedAt, isDeleted: true })).toBe("delete");
    expect(decidePulledRecord(local, { updatedAt: local.updatedAt, isDeleted: true })).toBe("keep");
  });
});
