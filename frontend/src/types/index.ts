export type SyncStatus = "local-only" | "pending" | "synced";
export interface BudgetRecord {
  id: string;
  userId: string;
  month: number;
  year: number;
  income: number;
  bills: number;
  food: number;
  transport: number;
  subscriptions: number;
  miscellaneous: number;
  syncStatus: SyncStatus;
  updatedAt: string;
  isDeleted?: boolean;
  clientRecordId?: string;
  serverUpdatedAt?: string;
  version?: number;
}
export type ExpenseCategory =
  "bills" | "food" | "transport" | "subscriptions" | "miscellaneous";
export type ExpenseFrequency =
  "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "one-time";
export interface RecurringExpense {
  id: string;
  clientId: string;
  userId: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  frequency: ExpenseFrequency;
  startDate: string;
  endDate?: string;
  dueDay?: number;
  isActive: boolean;
  paidOccurrences: string[];
  isDeleted: boolean;
  syncStatus: SyncStatus;
  updatedAt: string;
  serverUpdatedAt?: string;
  version?: number;
}
export interface User {
  id: string;
  name: string;
  email: string;
}
