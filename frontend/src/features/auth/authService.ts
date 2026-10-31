import { api } from "@/services/api";
import { authStore, cacheUser, clearCachedUser } from "@/services/db";
import type { User } from "@/types";

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

interface AuthResult {
  user: User;
  token: string;
}

async function persistSession(result: AuthResult): Promise<User> {
  localStorage.setItem("bb_token", result.token);
  await cacheUser(result.user);
  return result.user;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await api.post<ApiEnvelope<AuthResult>>("/auth/login", {
    email,
    password,
  });
  return persistSession(response.data.data);
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<User> {
  const response = await api.post<ApiEnvelope<AuthResult>>("/auth/register", {
    name,
    email,
    password,
  });
  return persistSession(response.data.data);
}

export async function loginWithGoogleCode(code: string): Promise<User> {
  const response = await api.post<ApiEnvelope<AuthResult>>("/auth/google", {
    code,
    redirectUri: "postmessage",
  });
  return persistSession(response.data.data);
}

export async function verifyCurrentUser(): Promise<User> {
  const response = await api.get<ApiEnvelope<{ user: User }>>("/auth/me");
  await cacheUser(response.data.data.user);
  return response.data.data.user;
}

export async function updateCachedUser(user: User): Promise<void> {
  await cacheUser(user);
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Local sign-out remains available when the API cannot be reached.
  }
  localStorage.removeItem("bb_token");
  await clearCachedUser();
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/reset-password", { token, newPassword });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post("/auth/change-password", { currentPassword, newPassword });
}

export async function clearLocalSession(): Promise<void> {
  localStorage.removeItem("bb_token");
  await clearCachedUser();
  await authStore.removeItem("currentUser");
}
