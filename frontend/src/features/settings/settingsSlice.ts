import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
interface SettingsState {
  theme: "light" | "dark";
  currency: string;
}
const initialState: SettingsState = {
  theme: (localStorage.getItem("bb-theme") as "light" | "dark") ?? "light",
  currency: localStorage.getItem("bb-currency") ?? "INR",
};
const slice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<"light" | "dark">) {
      state.theme = action.payload;
      localStorage.setItem("bb-theme", action.payload);
      document.documentElement.classList.toggle(
        "dark",
        action.payload === "dark",
      );
    },
    setCurrency(state, action: PayloadAction<string>) {
      state.currency = action.payload;
      localStorage.setItem("bb-currency", action.payload);
    },
  },
});
export const { setTheme, setCurrency } = slice.actions;
export default slice.reducer;
