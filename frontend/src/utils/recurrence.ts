import type { RecurringExpense } from "@/types";

const asDate = (value: string) => new Date(`${value}T00:00:00`);
const dateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

function monthlyDate(year: number, monthIndex: number, dueDay: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(dueDay, lastDay));
}

export function occurrenceDates(
  item: Pick<RecurringExpense, "frequency" | "startDate" | "endDate" | "dueDay" | "isActive" | "isDeleted">,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  if (!item.isActive || item.isDeleted) return [];
  const start = asDate(item.startDate);
  const end = item.endDate ? asDate(item.endDate) : rangeEnd;
  const lower = new Date(Math.max(start.getTime(), rangeStart.getTime()));
  const upper = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
  if (lower > upper) return [];
  const dates: string[] = [];
  if (item.frequency === "one-time") {
    if (start >= rangeStart && start <= rangeEnd && start <= end) dates.push(dateKey(start));
    return dates;
  }
  if (item.frequency === "daily" || item.frequency === "weekly") {
    const step = item.frequency === "daily" ? 1 : 7;
    const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const lowerUtc = Date.UTC(lower.getFullYear(), lower.getMonth(), lower.getDate());
    const elapsed = Math.max(0, Math.ceil((lowerUtc - startUtc) / 86_400_000));
    const offset = Math.ceil(elapsed / step) * step;
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    for (; ; date.setDate(date.getDate() + step)) {
      if (date > upper) break;
      if (date >= lower) dates.push(dateKey(date));
    }
    return dates;
  }
  const interval = item.frequency === "quarterly" ? 3 : item.frequency === "yearly" ? 12 : 1;
  const anchor = asDate(item.startDate);
  const dueDay = item.dueDay ?? anchor.getDate();
  const startIndex = anchor.getFullYear() * 12 + anchor.getMonth();
  const firstIndex = lower.getFullYear() * 12 + lower.getMonth();
  const skip = Math.max(0, Math.ceil((firstIndex - startIndex) / interval));
  for (let n = skip; ; n += 1) {
    const index = startIndex + n * interval;
    const date = monthlyDate(Math.floor(index / 12), index % 12, dueDay);
    if (date > upper) break;
    if (date >= lower && date >= anchor && date <= end) dates.push(dateKey(date));
  }
  return dates;
}

export function recurringDueInMonth(items: RecurringExpense[], year: number, month: number): number {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return items.reduce((sum, item) => {
    const unpaid = occurrenceDates(item, first, last).filter((date) => !item.paidOccurrences.includes(date));
    return sum + unpaid.length * item.amount;
  }, 0);
}

export function paidRecurringInMonth(items: RecurringExpense[], year: number, month: number): number {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return items.reduce((sum, item) => sum + occurrenceDates(item, first, last)
    .filter((date) => item.paidOccurrences.includes(date)).length * item.amount, 0);
}

export function toggleOccurrencePaid(item: RecurringExpense, date: string): RecurringExpense {
  const paid = new Set(item.paidOccurrences);
  if (paid.has(date)) paid.delete(date);
  else paid.add(date);
  return { ...item, paidOccurrences: [...paid].sort(), syncStatus: "pending", updatedAt: new Date().toISOString() };
}
