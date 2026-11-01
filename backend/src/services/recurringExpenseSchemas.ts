import { z } from "zod";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Date must be a real calendar day");
const item = z
  .object({
    clientId: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(100),
    category: z.enum([
      "bills",
      "food",
      "transport",
      "subscriptions",
      "miscellaneous",
    ]),
    amount: z.number().finite().min(0).max(1_000_000_000_000),
    frequency: z.enum([
      "daily",
      "weekly",
      "monthly",
      "quarterly",
      "yearly",
      "one-time",
    ]),
    startDate: date,
    endDate: date.optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
    isActive: z.boolean(),
    paidOccurrences: z
      .array(date)
      .max(5000)
      .refine(
        (dates) => new Set(dates).size === dates.length,
        "Paid dates must be unique",
      ),
    isDeleted: z.boolean(),
    updatedAt: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
  })
  .superRefine((value, context) => {
    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the first due date",
      });
    }
  });

export const recurringSyncSchema = z.object({
  records: z.array(item).max(100),
});
export const recurringChangesSchema = z.object({
  since: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
});
export type RecurringSyncRecord = z.infer<typeof item>;
