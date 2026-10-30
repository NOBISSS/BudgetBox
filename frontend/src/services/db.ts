import localforage from "localforage";
import type { User } from "@/types";

const options = { name: "BudgetBox", driver: localforage.INDEXEDDB };
export const authStore = localforage.createInstance({
  ...options,
  storeName: "auth",
});
export const settingsStore = localforage.createInstance({
  ...options,
  storeName: "settings",
});
type StoreInstance = ReturnType<typeof localforage.createInstance>;
const budgetStores = new Map<string, StoreInstance>();
const syncStores = new Map<string, StoreInstance>();

function namespace(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function budgetStoreFor(userId: string): StoreInstance {
  const key = namespace(userId);
  let instance = budgetStores.get(key);
  if (!instance) {
    instance = localforage.createInstance({
      ...options,
      storeName: `budgets_${key}`,
    });
    budgetStores.set(key, instance);
  }
  return instance;
}

export function syncStoreFor(userId: string): StoreInstance {
  const key = namespace(userId);
  let instance = syncStores.get(key);
  if (!instance) {
    instance = localforage.createInstance({
      ...options,
      storeName: `sync_${key}`,
    });
    syncStores.set(key, instance);
  }
  return instance;
}

export async function cacheUser(user: User): Promise<void> {
  await authStore.setItem("currentUser", user);
}

export const getCachedUser = () => authStore.getItem<User>("currentUser");
export const clearCachedUser = () => authStore.removeItem("currentUser");
export const getLastPulledAt = (userId: string) =>
  syncStoreFor(userId).getItem<string>("lastPulledAt");
export const setLastPulledAt = (userId: string, value: string) =>
  syncStoreFor(userId).setItem("lastPulledAt", value);
