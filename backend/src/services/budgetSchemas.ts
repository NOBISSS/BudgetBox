import { z } from "zod";

const amount = z.number().finite().min(0).max(1_000_000_000_000).default(0);
const syncRecordSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  income: amount,
  bills: amount,
  food: amount,
  transport: amount,
  subscriptions: amount,
  miscellaneous: amount,
  isDeleted: z.boolean().default(false),
  clientRecordId: z.string().trim().max(100).optional(),
  updatedAt: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
});

export const budgetSyncSchema = z.object({
  records: z.array(syncRecordSchema).max(24),
});
export const budgetHistoryQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
export const budgetChangesQuerySchema = z.object({
  since: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
});

export type BudgetSyncRecord = z.infer<typeof syncRecordSchema>;
