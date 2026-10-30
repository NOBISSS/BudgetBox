import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
const slice = createSlice({ name: 'ui', initialState: { isOnline: typeof navigator === 'undefined' ? true : navigator.onLine, openModal: '' }, reducers: { setOnline(state, action: PayloadAction<boolean>) { state.isOnline = action.payload; }, setModal(state, action: PayloadAction<string>) { state.openModal = action.payload; } } });
export const { setOnline, setModal } = slice.actions;
export default slice.reducer;
