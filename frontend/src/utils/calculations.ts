import type { BudgetRecord } from "@/types";
export const totalExpense = (b: BudgetRecord) =>
  b.bills + b.food + b.transport + b.subscriptions + b.miscellaneous;
export const burnRate = (b: BudgetRecord) =>
  b.income ? totalExpense(b) / b.income : 0;
export const savings = (b: BudgetRecord) => b.income - totalExpense(b);
export const monthEndPrediction = (b: BudgetRecord) => {
  const elapsed = new Date().getDate();
  const days = new Date(b.year, b.month, 0).getDate();
  return elapsed ? (totalExpense(b) / elapsed) * days : 0;
};
