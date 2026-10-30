import { budgetStore, settingsStore } from '@/services/db';
import type { BudgetRecord } from './types';
export const getBudget = (id: string) => budgetStore.getItem<BudgetRecord>(id);
export const listBudgets = async () => { const rows: BudgetRecord[] = []; await budgetStore.iterate<BudgetRecord, void>((value) => { rows.push(value); }); return rows.sort((a, b) => b.year - a.year || b.month - a.month); };
export const saveBudget = (record: BudgetRecord) => budgetStore.setItem(record.id, record);
export const deleteBudget = (id: string) => budgetStore.removeItem(id);
export const clearBudgets = async () => { await budgetStore.clear(); await settingsStore.setItem('budgetbox-seeded', true); };
