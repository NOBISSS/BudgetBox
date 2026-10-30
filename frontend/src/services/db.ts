import localforage from 'localforage';
export const budgetStore = localforage.createInstance({ name: 'BudgetBox', storeName: 'budgets' });
export const settingsStore = localforage.createInstance({ name: 'BudgetBox', storeName: 'settings' });
