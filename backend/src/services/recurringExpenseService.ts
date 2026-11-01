import type { Types } from "mongoose";
import { RecurringExpenseModel } from "../models/RecurringExpense.js";
import type { RecurringSyncRecord } from "./recurringExpenseSchemas.js";

export interface RecurringExpenseApiRecord extends Omit<RecurringSyncRecord, "updatedAt"> {
  id: string;
  userId: string;
  updatedAt: string;
  serverUpdatedAt: string;
  version: number;
}

interface PersistedRecurringExpense {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  clientId: string;
  name: string;
  category: RecurringSyncRecord["category"];
  amount: number;
  frequency: RecurringSyncRecord["frequency"];
  startDate: string;
  endDate?: string | null;
  dueDay?: number | null;
  isActive: boolean;
  paidOccurrences: string[];
  isDeleted: boolean;
  clientUpdatedAt: Date;
  serverUpdatedAt: Date;
  version: number;
}

function serialize(record: PersistedRecurringExpense): RecurringExpenseApiRecord {
  return {
    id: record.clientId,
    userId: String(record.userId),
    clientId: record.clientId,
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
    updatedAt: record.clientUpdatedAt.toISOString(),
    serverUpdatedAt: record.serverUpdatedAt.toISOString(),
    version: record.version,
  };
}

function identical(record: PersistedRecurringExpense, incoming: RecurringSyncRecord): boolean {
  return record.name === incoming.name
    && record.category === incoming.category
    && record.amount === incoming.amount
    && record.frequency === incoming.frequency
    && record.startDate === incoming.startDate
    && record.endDate === incoming.endDate
    && record.dueDay === incoming.dueDay
    && record.isActive === incoming.isActive
    && record.isDeleted === incoming.isDeleted
    && record.paidOccurrences.join("|") === incoming.paidOccurrences.join("|");
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function syncRecurringExpenses(userId: string, records: RecurringSyncRecord[]) {
  const results = [];
  for (const incoming of records) {
    const existing = await RecurringExpenseModel.findOne({ userId, clientId: incoming.clientId });
    if (existing && incoming.updatedAt.getTime() <= existing.clientUpdatedAt.getTime()) {
      const same = incoming.updatedAt.getTime() === existing.clientUpdatedAt.getTime()
        && identical(existing, incoming);
      results.push({
        clientId: incoming.clientId,
        outcome: same ? "unchanged" as const : "conflict_server_wins" as const,
        record: serialize(existing),
      });
      continue;
    }

    const serverUpdatedAt = new Date();
    const update = {
      $set: {
        name: incoming.name,
        category: incoming.category,
        amount: incoming.amount,
        frequency: incoming.frequency,
        startDate: incoming.startDate,
        ...(incoming.endDate ? { endDate: incoming.endDate } : {}),
        ...(incoming.dueDay !== undefined ? { dueDay: incoming.dueDay } : {}),
        isActive: incoming.isActive,
        paidOccurrences: incoming.paidOccurrences,
        isDeleted: incoming.isDeleted,
        clientUpdatedAt: incoming.updatedAt,
        serverUpdatedAt,
      },
      $inc: { version: 1 },
      $unset: {
        ...(!incoming.endDate ? { endDate: 1 } : {}),
        ...(incoming.dueDay === undefined ? { dueDay: 1 } : {}),
      },
    };

    try {
      const updated = await RecurringExpenseModel.findOneAndUpdate(
        { userId, clientId: incoming.clientId, clientUpdatedAt: { $lte: incoming.updatedAt } },
        update,
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: false },
      );
      if (updated) {
        results.push({
          clientId: incoming.clientId,
          outcome: updated.version === 1 ? "created" as const : "updated" as const,
          record: serialize(updated),
        });
        continue;
      }
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }

    // A concurrent insert may have won the unique-key race. Retry the conditional update
    // if this client carries a later timestamp; otherwise return the authoritative copy.
    const latest = await RecurringExpenseModel.findOne({ userId, clientId: incoming.clientId });
    if (latest && incoming.updatedAt.getTime() > latest.clientUpdatedAt.getTime()) {
      const retried = await RecurringExpenseModel.findOneAndUpdate(
        { userId, clientId: incoming.clientId, clientUpdatedAt: { $lt: incoming.updatedAt } },
        update,
        { new: true, runValidators: true },
      );
      if (retried) {
        results.push({ clientId: incoming.clientId, outcome: "updated" as const, record: serialize(retried) });
        continue;
      }
    }
    const authoritative = await RecurringExpenseModel.findOne({ userId, clientId: incoming.clientId });
    if (authoritative) {
      const same = incoming.updatedAt.getTime() === authoritative.clientUpdatedAt.getTime()
        && identical(authoritative, incoming);
      results.push({
        clientId: incoming.clientId,
        outcome: same ? "unchanged" as const : "conflict_server_wins" as const,
        record: serialize(authoritative),
      });
    }
  }
  return { syncedAt: new Date().toISOString(), results };
}

export async function getRecurringExpenseChanges(userId: string, since: Date) {
  const records = await RecurringExpenseModel.find({ userId, serverUpdatedAt: { $gt: since } }).sort({ serverUpdatedAt: 1 });
  return records.map(serialize);
}
