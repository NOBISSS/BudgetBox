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
export interface User {
  id: string;
  name: string;
  email: string;
}
