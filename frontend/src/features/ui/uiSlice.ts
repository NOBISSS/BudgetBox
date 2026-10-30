import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
interface UiState {
  isOnline: boolean;
  openModal: string;
  rateLimitSeconds: number;
  modalPayload: string[];
}
const initialState: UiState = {
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  openModal: "",
  rateLimitSeconds: 0,
  modalPayload: [],
};
const slice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setOnline(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
    },
    setModal(state, action: PayloadAction<string>) {
      state.openModal = action.payload;
    },
    showRateLimit(state, action: PayloadAction<number>) {
      state.openModal = "rate-limit";
      state.rateLimitSeconds = Math.max(1, action.payload);
    },
    tickRateLimit(state) {
      state.rateLimitSeconds = Math.max(0, state.rateLimitSeconds - 1);
      if (state.rateLimitSeconds === 0) state.openModal = "";
    },
    setModalPayload(state, action: PayloadAction<string[]>) {
      state.modalPayload = action.payload;
    },
  },
});
export const {
  setOnline,
  setModal,
  showRateLimit,
  tickRateLimit,
  setModalPayload,
} = slice.actions;
export default slice.reducer;
