import { budgetStoreFor, offlineAuthStore, recurringStoreFor, syncStoreFor } from "@/services/db";
import type { BudgetRecord } from "./types";

export const getBudget = (userId: string, id: string) =>
  budgetStoreFor(userId).getItem<BudgetRecord>(id);

export const listBudgets = async (userId: string): Promise<BudgetRecord[]> => {
  const rows: BudgetRecord[] = [];
  await budgetStoreFor(userId).iterate<BudgetRecord, void>((value) => {
    rows.push(value);
  });
  return rows.sort((a, b) => b.year - a.year || b.month - a.month);
};

export const saveBudget = (record: BudgetRecord) =>
  budgetStoreFor(record.userId).setItem(record.id, record);
export const deleteBudget = (userId: string, id: string) =>
  budgetStoreFor(userId).removeItem(id);

export async function clearBudgets(userId: string): Promise<void> {
  await Promise.all([
    budgetStoreFor(userId).clear(),
    recurringStoreFor(userId).clear(),
    syncStoreFor(userId).clear(),
    offlineAuthStore.removeItem(userId),
  ]);
}
