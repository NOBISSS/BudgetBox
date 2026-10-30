import axios from 'axios';
import { store } from '@/app/store';
import { setModal } from '@/features/ui/uiSlice';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '', timeout: 12000 });
api.interceptors.request.use((config) => { const token = localStorage.getItem('bb-token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use((response) => response, (error: unknown) => { if (axios.isAxiosError(error) && error.response?.status === 401) store.dispatch(setModal('session-expired')); return Promise.reject(error); });
