import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BudgetRecord } from '@/types';
import { listBudgets, saveBudget, deleteBudget } from './budgetDb';
import { settingsStore } from '@/services/db';
const today = new Date();
const seed: BudgetRecord[] = [
  { id: '2026-10', userId: 'demo', month: 10, year: 2026, income: 98000, bills: 28500, food: 14200, transport: 5700, subscriptions: 2200, miscellaneous: 8400, syncStatus: 'synced', updatedAt: new Date().toISOString() },
  { id: '2026-09', userId: 'demo', month: 9, year: 2026, income: 96000, bills: 27400, food: 12600, transport: 5100, subscriptions: 2200, miscellaneous: 6800, syncStatus: 'synced', updatedAt: new Date().toISOString() },
  { id: '2026-08', userId: 'demo', month: 8, year: 2026, income: 96000, bills: 27400, food: 16700, transport: 6200, subscriptions: 2200, miscellaneous: 9100, syncStatus: 'pending', updatedAt: new Date().toISOString() },
  { id: '2026-07', userId: 'demo', month: 7, year: 2026, income: 92000, bills: 26800, food: 11900, transport: 5300, subscriptions: 2100, miscellaneous: 7100, syncStatus: 'synced', updatedAt: new Date().toISOString() }
];
interface BudgetState { records: BudgetRecord[]; activeId: string; loaded: boolean }
const initialState: BudgetState = { records: seed, activeId: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`, loaded: false };
export const hydrateBudgets = createAsyncThunk('budget/hydrate', async () => { const saved = await listBudgets(); if (saved.length) return saved; const initialized = await settingsStore.getItem<boolean>('budgetbox-seeded'); if (initialized) return []; await Promise.all(seed.map(saveBudget)); await settingsStore.setItem('budgetbox-seeded', true); return seed; });
export const persistBudget = createAsyncThunk('budget/persist', async (record: BudgetRecord) => { await saveBudget(record); return record; });
export const removeBudget = createAsyncThunk('budget/remove', async (id: string) => { await deleteBudget(id); return id; });
const slice = createSlice({ name: 'budget', initialState, reducers: { setActiveBudget(state, action: PayloadAction<string>) { state.activeId = action.payload; }, upsertBudget(state, action: PayloadAction<BudgetRecord>) { const i = state.records.findIndex((r) => r.id === action.payload.id); if (i < 0) state.records.unshift(action.payload); else state.records[i] = action.payload; } }, extraReducers: (builder) => builder.addCase(hydrateBudgets.fulfilled, (state, action) => { state.records = action.payload; state.loaded = true; if (!state.records.some((r) => r.id === state.activeId)) state.activeId = state.records[0]?.id ?? state.activeId; }).addCase(persistBudget.fulfilled, (state, action) => { const i = state.records.findIndex((r) => r.id === action.payload.id); if (i < 0) state.records.unshift(action.payload); else state.records[i] = action.payload; }).addCase(removeBudget.fulfilled, (state, action) => { state.records = state.records.filter((r) => r.id !== action.payload); }) });
export const { setActiveBudget, upsertBudget } = slice.actions;
export default slice.reducer;
