import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { removeLocalBudget, upsertBudget } from "@/features/budget/budgetSlice";
import { setModal, setModalPayload } from "@/features/ui/uiSlice";
import { syncBudgets } from "./syncService";
import { replaceRecurring } from "@/features/budget/recurringSlice";

interface SyncState {
  syncing: boolean;
  lastSynced: string | null;
  conflictMonths: string[];
}
const initialState: SyncState = {
  syncing: false,
  lastSynced: null,
  conflictMonths: [],
};

export const runSync = createAsyncThunk(
  "sync/run",
  async (userId: string, { dispatch }) => {
    const report = await syncBudgets(userId);
    dispatch(replaceRecurring(report.recurringExpenses));
    report.records.forEach((record) => dispatch(upsertBudget(record)));
    report.deletedIds.forEach((id) => dispatch(removeLocalBudget(id)));
    if (report.conflictMonths.length) {
      dispatch(setModalPayload(report.conflictMonths));
      dispatch(setModal("sync-conflict"));
    }
    return report;
  },
);

const slice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    dismissSyncConflict(state) {
      state.conflictMonths = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runSync.pending, (state) => {
        state.syncing = true;
      })
      .addCase(runSync.fulfilled, (state, action) => {
        state.syncing = false;
        state.lastSynced = new Date().toISOString();
        state.conflictMonths = action.payload.conflictMonths;
      })
      .addCase(runSync.rejected, (state) => {
        state.syncing = false;
      });
  },
});

export const { dismissSyncConflict } = slice.actions;
export default slice.reducer;
