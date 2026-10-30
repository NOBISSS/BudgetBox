import { describe, expect, it } from "vitest";
import { anomalyRules } from "./anomalyRules";
import type { BudgetRecord } from "@/types";

const base: BudgetRecord = {
  id: "2025-01",
  userId: "user-1",
  month: 1,
  year: 2025,
  income: 1000,
  bills: 100,
  food: 100,
  transport: 0,
  subscriptions: 100,
  miscellaneous: 0,
  syncStatus: "pending",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("rule based spending alerts", () => {
  it("does not alert on exact category thresholds", () => {
    expect(anomalyRules({ ...base, food: 400, subscriptions: 100, bills: 100 })).toEqual([]);
    expect(anomalyRules({ ...base, food: 100, subscriptions: 300, bills: 100 })).toEqual([]);
    expect(anomalyRules({ ...base, food: 100, subscriptions: 100, bills: 500 })).toEqual([]);
  });

  it("alerts immediately above each threshold", () => {
    expect(anomalyRules({ ...base, food: 401, subscriptions: 100, bills: 100 }).map((alert) => alert.id)).toContain("food");
    expect(anomalyRules({ ...base, food: 100, subscriptions: 301, bills: 100 }).map((alert) => alert.id)).toContain("subs");
    expect(anomalyRules({ ...base, food: 100, subscriptions: 100, bills: 501 }).map((alert) => alert.id)).toContain("bills");
  });

  it("flags overspending only above income and suppresses ratios at zero income", () => {
    expect(anomalyRules({ ...base, bills: 800 }).some((alert) => alert.id === "overspend")).toBe(false);
    expect(anomalyRules({ ...base, bills: 801 }).some((alert) => alert.id === "overspend")).toBe(true);
    expect(anomalyRules({ ...base, income: 0, bills: 5000, food: 5000 })).toEqual([]);
  });
});
