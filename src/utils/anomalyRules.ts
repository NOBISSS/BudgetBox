import type { BudgetRecord } from '@/types';
import { totalExpense } from './calculations';
export interface Alert { id: string; severity: 'amber' | 'red'; message: string; suggestion: string }
export const anomalyRules = (b: BudgetRecord): Alert[] => {
  const alerts: Alert[] = [];
  if (b.income > 0 && b.food > .4 * b.income) alerts.push({ id: 'food', severity: 'amber', message: 'Food is above 40% of your income.', suggestion: 'Try setting a weekly dining and grocery limit.' });
  if (b.income > 0 && b.subscriptions > .3 * b.income) alerts.push({ id: 'subs', severity: 'amber', message: 'Subscriptions are above 30% of your income.', suggestion: 'Review recurring plans you no longer use.' });
  if (b.income > 0 && totalExpense(b) > b.income) alerts.push({ id: 'overspend', severity: 'red', message: 'Expenses are higher than income.', suggestion: 'Pause flexible spending and revisit your monthly plan.' });
  if (b.income > 0 && b.bills > .5 * b.income) alerts.push({ id: 'bills', severity: 'amber', message: 'Monthly bills are above 50% of your income.', suggestion: 'Look for a lower-cost option on recurring essentials.' });
  return alerts;
};
