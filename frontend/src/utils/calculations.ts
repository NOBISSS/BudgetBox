import type { BudgetRecord } from "@/types";
import type { RecurringExpense } from "@/types";
import { paidRecurringInMonth, recurringDueInMonth } from "./recurrence";
export const totalExpense = (b: BudgetRecord) =>
  b.bills + b.food + b.transport + b.subscriptions + b.miscellaneous;
export const burnRate = (b: BudgetRecord) =>
  b.income ? totalExpense(b) / b.income : 0;
export const savings = (b: BudgetRecord) => b.income - totalExpense(b);
export const monthEndPrediction = (
  b: BudgetRecord,
  recurring: RecurringExpense[] = [],
  today = new Date(),
) => {
  const days = new Date(b.year, b.month, 0).getDate();
  const sameMonth = today.getFullYear() === b.year && today.getMonth() + 1 === b.month;
  const elapsed = sameMonth ? Math.max(1, Math.min(today.getDate(), days)) : days;
  const paidRecurring = recurring.filter((item) => item.category !== "bills" && item.category !== "subscriptions");
  const paidOther = paidRecurringInMonth(paidRecurring, b.year, b.month);
  const fixedPaid = b.bills + b.subscriptions + paidOther;
  const variableSpent = Math.max(0, b.food + b.transport + b.miscellaneous - paidOther);
  const fixedDue = recurringDueInMonth(recurring, b.year, b.month);
  return fixedPaid + fixedDue + (variableSpent / elapsed) * days;
};
