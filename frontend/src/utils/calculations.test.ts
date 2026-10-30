import { describe, expect, it } from "vitest";
import { burnRate, monthEndPrediction, savings, totalExpense } from "./calculations";
import type { BudgetRecord } from "@/types";

const record: BudgetRecord = {
  id: "2025-01",
  userId: "user-1",
  month: 1,
  year: 2025,
  income: 1000,
  bills: 200,
  food: 100,
  transport: 50,
  subscriptions: 25,
  miscellaneous: 25,
  syncStatus: "pending",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

describe("budget calculations", () => {
  it("totals expenses, savings, and burn rate", () => {
    expect(totalExpense(record)).toBe(400);
    expect(savings(record)).toBe(600);
    expect(burnRate(record)).toBe(0.4);
  });

  it("returns zero burn rate for zero income and a non-negative prediction", () => {
    expect(burnRate({ ...record, income: 0 })).toBe(0);
    expect(monthEndPrediction({ ...record, bills: 0, food: 0, transport: 0, subscriptions: 0, miscellaneous: 0 })).toBe(0);
  });
});
