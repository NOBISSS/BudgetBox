import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { RecurringExpense } from "@/types";
import { listRecurringExpenses, saveRecurringExpense } from "@/services/db";

interface State {
  records: RecurringExpense[];
  loaded: boolean;
}
const initialState: State = { records: [], loaded: false };
export const hydrateRecurring = createAsyncThunk(
  "recurring/hydrate",
  listRecurringExpenses,
);
export const persistRecurring = createAsyncThunk(
  "recurring/persist",
  async (record: RecurringExpense) => {
    await saveRecurringExpense(record);
    return record;
  },
);
const slice = createSlice({
  name: "recurring",
  initialState,
  reducers: {
    replaceRecurring(state, action: PayloadAction<RecurringExpense[]>) {
      state.records = action.payload;
    },
    clearRecurring(state) {
      state.records = [];
      state.loaded = true;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(hydrateRecurring.fulfilled, (state, action) => {
        state.records = action.payload;
        state.loaded = true;
      })
      .addCase(persistRecurring.fulfilled, (state, action) => {
        const i = state.records.findIndex(
          (record) => record.id === action.payload.id,
        );
        if (i < 0) state.records.unshift(action.payload);
        else state.records[i] = action.payload;
      }),
});
export const { replaceRecurring, clearRecurring } = slice.actions;
export default slice.reducer;
