import type { Types } from "mongoose";
import { redis } from "../config/redis.js";
import { BudgetModel } from "../models/Budget.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";
import type { BudgetSyncRecord } from "./budgetSchemas.js";

export type SyncOutcome =
  "created" | "updated" | "conflict_server_wins" | "unchanged";

export interface BudgetApiRecord {
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

function serialize(record: {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  month: number;
  year: number;
  income: number;
  bills: number;
  food: number;
  transport: number;
  subscriptions: number;
  miscellaneous: number;
  clientUpdatedAt: Date;
  serverUpdatedAt: Date;
  version: number;
  isDeleted: boolean;
  clientRecordId?: string | null;
}): BudgetApiRecord {
  return {
    id: String(record._id),
    userId: String(record.userId),
    month: record.month,
    year: record.year,
    income: record.income,
    bills: record.bills,
    food: record.food,
    transport: record.transport,
    subscriptions: record.subscriptions,
    miscellaneous: record.miscellaneous,
    clientUpdatedAt: record.clientUpdatedAt.toISOString(),
    serverUpdatedAt: record.serverUpdatedAt.toISOString(),
    version: record.version,
    isDeleted: record.isDeleted,
    ...(record.clientRecordId ? { clientRecordId: record.clientRecordId } : {}),
  };
}

function sameValues(
  existing: BudgetApiRecord,
  incoming: BudgetSyncRecord,
): boolean {
  return (
    existing.income === incoming.income &&
    existing.bills === incoming.bills &&
    existing.food === incoming.food &&
    existing.transport === incoming.transport &&
    existing.subscriptions === incoming.subscriptions &&
    existing.miscellaneous === incoming.miscellaneous &&
    existing.isDeleted === incoming.isDeleted &&
    existing.clientRecordId === incoming.clientRecordId
  );
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function cacheKeys(userId: string, year: number) {
  return [
    `budget:latest:${userId}`,
    `budget:history:${userId}:all`,
    `budget:history:${userId}:${year}`,
  ];
}

async function invalidateCache(userId: string, year: number): Promise<void> {
  try {
    await redis.del(...cacheKeys(userId, year));
  } catch (error) {
    logger.warn({ error, userId }, "Budget cache invalidation failed");
  }
}

async function fetchByMonth(
  userId: string,
  month: number,
  year: number,
): Promise<BudgetApiRecord> {
  const record = await BudgetModel.findOne({ userId, month, year });
  if (!record)
    throw new ApiError(
      500,
      "SYNC_RECORD_MISSING",
      "Could not load the authoritative budget record",
    );
  return serialize(record);
}

async function syncOne(
  userId: string,
  incoming: BudgetSyncRecord,
): Promise<{ outcome: SyncOutcome; record: BudgetApiRecord }> {
  const existingDoc = await BudgetModel.findOne({
    userId,
    month: incoming.month,
    year: incoming.year,
  });
  if (existingDoc) {
    const existing = serialize(existingDoc);
    const existingTime = existingDoc.clientUpdatedAt.getTime();
    const incomingTime = incoming.updatedAt.getTime();
    if (incomingTime < existingTime)
      return { outcome: "conflict_server_wins", record: existing };
    if (incomingTime === existingTime && sameValues(existing, incoming))
      return { outcome: "unchanged", record: existing };
  }

  const filter = {
    userId,
    month: incoming.month,
    year: incoming.year,
    clientUpdatedAt: { $lte: incoming.updatedAt },
  };
  const fields = {
    income: incoming.income,
    bills: incoming.bills,
    food: incoming.food,
    transport: incoming.transport,
    subscriptions: incoming.subscriptions,
    miscellaneous: incoming.miscellaneous,
    clientUpdatedAt: incoming.updatedAt,
    serverUpdatedAt: new Date(),
    isDeleted: incoming.isDeleted,
    clientRecordId: incoming.clientRecordId,
  };

  try {
    const updated = await BudgetModel.findOneAndUpdate(
      filter,
      { $set: fields, $inc: { version: 1 } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: false,
      },
    );
    if (updated) {
      await invalidateCache(userId, incoming.year);
      return {
        outcome: existingDoc ? "updated" : "created",
        record: serialize(updated),
      };
    }
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }

  const authoritative = await fetchByMonth(
    userId,
    incoming.month,
    incoming.year,
  );
  if (
    authoritative.clientUpdatedAt === incoming.updatedAt.toISOString() &&
    sameValues(authoritative, incoming)
  ) {
    return { outcome: "unchanged", record: authoritative };
  }
  return { outcome: "conflict_server_wins", record: authoritative };
}

export async function syncBudgets(
  userId: string,
  incoming: BudgetSyncRecord[],
) {
  const results = [];
  for (const item of incoming) {
    const result = await syncOne(userId, item);
    results.push({ month: item.month, year: item.year, ...result });
  }
  return { syncedAt: new Date().toISOString(), results };
}

async function readCache<T>(key: string): Promise<T | undefined> {
  try {
    const value = await redis.get(key);
    return value === null ? undefined : (JSON.parse(value) as T);
  } catch (error) {
    logger.warn({ error, key }, "Budget cache read failed; querying MongoDB");
    return undefined;
  }
}

async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", 60);
  } catch (error) {
    logger.warn({ error, key }, "Budget cache write failed");
  }
}

export async function getLatestBudget(userId: string) {
  const key = `budget:latest:${userId}`;
  const cached = await readCache<BudgetApiRecord | null>(key);
  if (cached !== undefined) return { record: cached, cache: "HIT" as const };
  const doc = await BudgetModel.findOne({ userId, isDeleted: false }).sort({
    serverUpdatedAt: -1,
  });
  const record = doc ? serialize(doc) : null;
  await writeCache(key, record);
  return { record, cache: "MISS" as const };
}

export async function getBudgetHistory(userId: string, year?: number) {
  const key = `budget:history:${userId}:${year ?? "all"}`;
  const cached = await readCache<BudgetApiRecord[]>(key);
  if (cached !== undefined) return { records: cached, cache: "HIT" as const };
  const query =
    year === undefined
      ? { userId, isDeleted: false }
      : { userId, year, isDeleted: false };
  const docs = await BudgetModel.find(query).sort({ year: -1, month: -1 });
  const records = docs.map(serialize);
  await writeCache(key, records);
  return { records, cache: "MISS" as const };
}

export async function getBudgetChanges(userId: string, since: Date) {
  const docs = await BudgetModel.find({
    userId,
    serverUpdatedAt: { $gt: since },
  }).sort({ serverUpdatedAt: 1 });
  return docs.map(serialize);
}
