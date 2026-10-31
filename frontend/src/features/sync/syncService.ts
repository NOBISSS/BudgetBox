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
import { getLastPulledAt, setLastPulledAt } from "@/services/db";
import { decidePulledRecord } from "@/utils/syncMerge";

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
  deletedIds: string[];
  conflictMonths: string[];
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
    deletedIds: [],
    conflictMonths: [],
  };

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
