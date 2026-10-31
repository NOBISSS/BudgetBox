import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { BudgetRecord } from "@/types";
import { deleteBudget, getBudget, listBudgets, saveBudget } from "./budgetDb";

const currentId = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

interface BudgetState {
  records: BudgetRecord[];
  activeId: string;
  loaded: boolean;
}

const initialState: BudgetState = {
  records: [],
  activeId: currentId(),
  loaded: false,
};

export const hydrateBudgets = createAsyncThunk(
  "budget/hydrate",
  async (userId: string) => listBudgets(userId),
);
export const persistBudget = createAsyncThunk(
  "budget/persist",
  async (record: BudgetRecord) => {
    await saveBudget(record);
    return record;
  },
);
export const removeBudget = createAsyncThunk(
  "budget/remove",
  async ({ userId, id }: { userId: string; id: string }) => {
    const record = await getBudget(userId, id);
    if (!record) return null;
    const tombstone: BudgetRecord = {
      ...record,
      isDeleted: true,
      syncStatus: "pending",
      updatedAt: new Date().toISOString(),
    };
    await saveBudget(tombstone);
    return tombstone;
  },
);

const slice = createSlice({
  name: "budget",
  initialState,
  reducers: {
    setActiveBudget(state, action: PayloadAction<string>) {
      state.activeId = action.payload;
    },
    upsertBudget(state, action: PayloadAction<BudgetRecord>) {
      const index = state.records.findIndex(
        (record) => record.id === action.payload.id,
      );
      if (index < 0) state.records.unshift(action.payload);
      else state.records[index] = action.payload;
    },
    removeLocalBudget(state, action: PayloadAction<string>) {
      state.records = state.records.filter(
        (record) => record.id !== action.payload,
      );
    },
    clearBudgetState(state) {
      state.records = [];
      state.loaded = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateBudgets.fulfilled, (state, action) => {
        state.records = action.payload;
        state.loaded = true;
        if (
          !state.records.some(
            (record) => record.id === state.activeId && !record.isDeleted,
          )
        ) {
          state.activeId =
            state.records.find((record) => !record.isDeleted)?.id ??
            state.activeId;
        }
      })
      .addCase(persistBudget.fulfilled, (state, action) => {
        const index = state.records.findIndex(
          (record) => record.id === action.payload.id,
        );
        if (index < 0) state.records.unshift(action.payload);
        else state.records[index] = action.payload;
      })
      .addCase(removeBudget.fulfilled, (state, action) => {
        if (!action.payload) return;
        const index = state.records.findIndex(
          (record) => record.id === action.payload?.id,
        );
        if (index < 0) state.records.unshift(action.payload);
        else state.records[index] = action.payload;
      });
  },
});

export const {
  setActiveBudget,
  upsertBudget,
  removeLocalBudget,
  clearBudgetState,
} = slice.actions;
export default slice.reducer;
