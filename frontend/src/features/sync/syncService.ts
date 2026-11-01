import axios from "axios";
import { api } from "@/services/api";
import {
  deleteBudget,
  getBudget,
  listBudgets,
  saveBudget,
} from "@/features/budget/budgetDb";
import type { BudgetRecord } from "@/types";
import { monthName } from "@/utils/formatters";
import { getLastPulledAt, setLastPulledAt, getRecurringLastPulledAt, setRecurringLastPulledAt } from "@/services/db";
import { decidePulledRecord } from "@/utils/syncMerge";
import { getRecurringExpense, listRecurringExpenses, saveRecurringExpense } from "@/services/db";
import type { RecurringExpense } from "@/types";

interface ApiEnvelope<T> {
  success: true;
  data: T;
}
interface ServerBudget {
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
  clientUpdatedAt: string;
  serverUpdatedAt: string;
  version: number;
  isDeleted: boolean;
  clientRecordId?: string;
}
interface SyncResult {
  month: number;
  year: number;
  outcome: "created" | "updated" | "conflict_server_wins" | "unchanged";
  record: ServerBudget;
}
interface SyncReport {
  records: BudgetRecord[];
  recurringExpenses: RecurringExpense[];
  deletedIds: string[];
  conflictMonths: string[];
}
interface ServerRecurringExpense extends Omit<RecurringExpense, "syncStatus" | "serverUpdatedAt" | "version"> {
  serverUpdatedAt: string;
  version: number;
}

const monthKey = (record: Pick<ServerBudget, "year" | "month">) =>
  `${record.year}-${String(record.month).padStart(2, "0")}`;

function asLocal(
  record: ServerBudget,
  userId: string,
  syncStatus: BudgetRecord["syncStatus"],
): BudgetRecord {
  return {
    id: record.clientRecordId || monthKey(record),
    userId,
    month: record.month,
    year: record.year,
    income: record.income,
    bills: record.bills,
    food: record.food,
    transport: record.transport,
    subscriptions: record.subscriptions,
    miscellaneous: record.miscellaneous,
    syncStatus,
    updatedAt: record.clientUpdatedAt,
    isDeleted: record.isDeleted,
    clientRecordId: record.clientRecordId,
    serverUpdatedAt: record.serverUpdatedAt,
    version: record.version,
  };
}

function isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return error.response ? error.response.status >= 500 : navigator.onLine;
}

async function withRetries<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === 3 || !isRetryable(error)) throw error;
      await new Promise((resolve) =>
        window.setTimeout(resolve, 500 * 2 ** attempt),
      );
    }
  }
  throw lastError;
}

async function performSync(userId: string): Promise<SyncReport> {
  if (!navigator.onLine) throw new Error("offline");
  const local = await listBudgets(userId);
  const pending = local.filter((record) => record.syncStatus !== "synced");
  const report: SyncReport = {
    records: [],
    recurringExpenses: [],
    deletedIds: [],
    conflictMonths: [],
  };

  const recurring = await listRecurringExpenses(userId);
  const pendingRecurring = recurring.filter((record) => record.syncStatus !== "synced");
  for (let offset = 0; offset < pendingRecurring.length; offset += 100) {
    const batch = pendingRecurring.slice(offset, offset + 100);
    const response = await withRetries(() => api.post<ApiEnvelope<{ results: Array<{ clientId: string; outcome: "created" | "updated" | "unchanged" | "conflict_server_wins"; record: ServerRecurringExpense }> }>>(
      "/budget/recurring/sync",
      { records: batch.map((record) => ({
        clientId: record.clientId || record.id,
        name: record.name,
        category: record.category,
        amount: record.amount,
        frequency: record.frequency,
        startDate: record.startDate,
        ...(record.endDate ? { endDate: record.endDate } : {}),
        ...(record.dueDay ? { dueDay: record.dueDay } : {}),
        isActive: record.isActive,
        paidOccurrences: record.paidOccurrences,
        isDeleted: record.isDeleted,
        updatedAt: record.updatedAt,
      })) },
    ));
    for (const result of response.data.data.results) {
      const sent = batch.find((item) => item.id === result.clientId);
      if (!sent) continue;
      if (result.outcome === "conflict_server_wins") report.conflictMonths.push(`Recurring payment: ${sent.name}`);
      const current = await getRecurringExpense(userId, sent.id);
      if (current?.updatedAt !== sent.updatedAt) continue;
      await saveRecurringExpense({ ...result.record, id: result.clientId, userId, syncStatus: "synced" });
    }
  }

  const lastRecurringPull = await getRecurringLastPulledAt(userId);
  const recurringPullStart = new Date().toISOString();
  const recurringChanges = await withRetries(() => api.get<ApiEnvelope<{ records: ServerRecurringExpense[] }>>(
    "/budget/recurring/changes", { params: { since: lastRecurringPull ?? new Date(0).toISOString() } },
  ));
  for (const server of recurringChanges.data.data.records) {
    const current = await getRecurringExpense(userId, server.clientId);
    if (current && new Date(current.updatedAt).getTime() >= new Date(server.updatedAt).getTime()) continue;
    if (current?.syncStatus === "pending") report.conflictMonths.push(`Recurring payment: ${current.name}`);
    await saveRecurringExpense({ ...server, id: server.clientId, userId, syncStatus: "synced" });
  }
  await setRecurringLastPulledAt(userId, recurringPullStart);
  report.recurringExpenses = await listRecurringExpenses(userId);

  if (pending.length > 0) {
    const requestRecords = pending.map((record) => ({
      month: record.month,
      year: record.year,
      income: record.income,
      bills: record.bills,
      food: record.food,
      transport: record.transport,
      subscriptions: record.subscriptions,
      miscellaneous: record.miscellaneous,
      isDeleted: record.isDeleted ?? false,
      clientRecordId: record.id,
      updatedAt: record.updatedAt,
    }));
    const response = await withRetries(() =>
      api.post<ApiEnvelope<{ syncedAt: string; results: SyncResult[] }>>(
        "/budget/sync",
        { records: requestRecords },
      ),
    );
    for (const result of response.data.data.results) {
      const sent = pending.find(
        (record) =>
          record.month === result.month && record.year === result.year,
      );
      if (!sent) continue;
      const current = await getBudget(userId, sent.id);
      const unchangedDuringRequest = current?.updatedAt === sent.updatedAt;
      if (result.outcome === "conflict_server_wins") {
        report.conflictMonths.push(`${monthName(result.month)} ${result.year}`);
        if (!unchangedDuringRequest) continue;
      } else if (!unchangedDuringRequest) {
        continue;
      }
      const authoritative = asLocal(result.record, userId, "synced");
      if (authoritative.isDeleted) {
        await deleteBudget(userId, sent.id);
        report.deletedIds.push(sent.id);
      } else {
        await saveBudget(authoritative);
        report.records.push(authoritative);
      }
    }
  }

  const previousPull = await getLastPulledAt(userId);
  const pullStart = new Date().toISOString();
  const since = previousPull ?? new Date(0).toISOString();
  const changesResponse = await withRetries(() =>
    api.get<ApiEnvelope<{ records: ServerBudget[] }>>("/budget/changes", {
      params: { since },
    }),
  );
  for (const serverRecord of changesResponse.data.data.records) {
    const id = serverRecord.clientRecordId || monthKey(serverRecord);
    const current = await getBudget(userId, id);
    const serverLocal = asLocal(serverRecord, userId, "synced");
    const decision = decidePulledRecord(current, serverLocal);
    if (decision === "keep") continue;
    if (decision === "delete") {
      if (current) {
        await deleteBudget(userId, current.id);
        report.deletedIds.push(current.id);
      }
      continue;
    }
    const merged = asLocal(serverRecord, userId, "synced");
    await saveBudget(merged);
    report.records.push(merged);
  }
  // Store the pull start, so changes made while the request was in flight are picked up next time.
  await setLastPulledAt(userId, pullStart);
  return report;
}

let activeSync: Promise<SyncReport> | null = null;
export function syncBudgets(userId: string): Promise<SyncReport> {
  if (activeSync) return activeSync;
  activeSync = performSync(userId).finally(() => {
    activeSync = null;
  });
  return activeSync;
}
