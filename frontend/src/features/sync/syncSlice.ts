import { createSlice } from '@reduxjs/toolkit';
const slice = createSlice({ name: 'sync', initialState: { syncing: false, lastSynced: 'Today, 9:41 AM' }, reducers: { startSync(state) { state.syncing = true; }, finishSync(state) { state.syncing = false; state.lastSynced = 'Just now'; } } });
export const { startSync, finishSync } = slice.actions;
export default slice.reducer;
