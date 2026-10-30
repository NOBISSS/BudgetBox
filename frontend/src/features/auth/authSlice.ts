import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types";
interface AuthState {
  user: User | null;
  token: string | null;
}
const initialState: AuthState = {
  user: null,
  token:
    typeof localStorage === "undefined"
      ? null
      : localStorage.getItem("bb_token"),
};
const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.token = action.payload ? localStorage.getItem("bb_token") : null;
      if (!action.payload) localStorage.removeItem("bb_token");
    },
  },
});
export const { setUser } = slice.actions;
export default slice.reducer;
