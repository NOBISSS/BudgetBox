import { describe, expect, it } from "vitest";
import type { RecurringExpense } from "@/types";
import { occurrenceDates, recurringDueInMonth } from "./recurrence";
import { monthEndPrediction } from "./calculations";

const schedule = (
  overrides: Partial<RecurringExpense> = {},
): RecurringExpense => ({
  id: "rent",
  clientId: "rent",
  userId: "user-1",
  name: "Rent",
  category: "bills",
  amount: 1000,
  frequency: "monthly",
  startDate: "2026-01-31",
  dueDay: 31,
  isActive: true,
  paidOccurrences: [],
  isDeleted: false,
  syncStatus: "synced",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("recurring payment dates and projections", () => {
  it("clamps month-end due dates in short months", () => {
    expect(
      occurrenceDates(schedule(), new Date(2026, 1, 1), new Date(2026, 1, 28)),
    ).toEqual(["2026-02-28"]);
  });

  it("keeps quarterly cash flow in the actual payment months", () => {
    const quarterly = schedule({
      frequency: "quarterly",
      startDate: "2026-01-15",
      dueDay: 15,
      amount: 3000,
    });
    expect(
      occurrenceDates(quarterly, new Date(2026, 2, 1), new Date(2026, 2, 31)),
    ).toEqual([]);
    expect(recurringDueInMonth([quarterly], 2026, 4)).toBe(3000);
  });

  it("does not project fixed bills as daily spend, and includes only unpaid occurrences", () => {
    const budget = {
      id: "2026-11",
      userId: "user-1",
      month: 11,
      year: 2026,
      income: 40000,
      bills: 1000,
      food: 0,
      transport: 0,
      subscriptions: 0,
      miscellaneous: 0,
      syncStatus: "synced" as const,
      updatedAt: "2026-11-01T00:00:00.000Z",
    };
    const rent = schedule({ startDate: "2026-11-10", dueDay: 10 });
    expect(monthEndPrediction(budget, [rent], new Date(2026, 10, 1))).toBe(
      2000,
    );
    expect(
      monthEndPrediction(
        budget,
        [{ ...rent, paidOccurrences: ["2026-11-10"] }],
        new Date(2026, 10, 1),
      ),
    ).toBe(1000);
  });
});
