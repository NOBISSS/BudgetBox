import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';
interface AuthState { user: User | null }
const stored = localStorage.getItem('bb-user');
const initialState: AuthState = { user: stored ? JSON.parse(stored) as User : null };
const slice = createSlice({ name: 'auth', initialState, reducers: { setUser(state, action: PayloadAction<User | null>) { state.user = action.payload; if (action.payload) localStorage.setItem('bb-user', JSON.stringify(action.payload)); else localStorage.removeItem('bb-user'); } } });
export const { setUser } = slice.actions;
export default slice.reducer;
