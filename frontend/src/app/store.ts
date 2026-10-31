import { configureStore } from "@reduxjs/toolkit";
import auth from "@/features/auth/authSlice";
import budget from "@/features/budget/budgetSlice";
import settings from "@/features/settings/settingsSlice";
import sync from "@/features/sync/syncSlice";
import ui from "@/features/ui/uiSlice";
export const store = configureStore({
  reducer: { auth, budget, settings, sync, ui },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
