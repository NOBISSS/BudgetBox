import axios from "axios";
import { store } from "@/app/store";
import { setModal, setOnline, showRateLimit } from "@/features/ui/uiSlice";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
  timeout: 12000,
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("bb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (
        error.response?.status === 401 &&
        !error.config?.url?.includes("/auth/login") &&
        !error.config?.url?.includes("/auth/register")
      )
        store.dispatch(setModal("session-expired"));
      if (error.response?.status === 429) {
        const body = error.response.data as {
          error?: { retryAfterSeconds?: number };
        };
        const header = Number(error.response.headers["retry-after"]);
        store.dispatch(
          showRateLimit(
            body.error?.retryAfterSeconds ??
              (Number.isFinite(header) && header > 0 ? header : 60),
          ),
        );
      }
      if (!error.response && error.request) store.dispatch(setOnline(false));
    }
    return Promise.reject(error);
  },
);
