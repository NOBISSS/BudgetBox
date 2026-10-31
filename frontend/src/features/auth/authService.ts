import { api } from "@/services/api";
import {
  authStore,
  cacheUser,
  clearCachedUser,
  offlineAuthStore,
} from "@/services/db";
import type { User } from "@/types";

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

interface AuthResult {
  user: User;
  token: string;
}

interface OfflineLoginRecord {
  user: User;
  email: string;
  salt: string;
  verifier: string;
  iterations: number;
}

const offlineVerifierIterations = 310_000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveOfflineVerifier(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations },
    material,
    256,
  );
  return new Uint8Array(bits);
}

export async function rememberOfflineLogin(
  user: User,
  password: string,
): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const verifier = await deriveOfflineVerifier(
    password,
    salt,
    offlineVerifierIterations,
  );
  const record: OfflineLoginRecord = {
    user,
    email: user.email.trim().toLowerCase(),
    salt: toBase64(salt),
    verifier: toBase64(verifier),
    iterations: offlineVerifierIterations,
  };
  await offlineAuthStore.setItem(user.id, record);
}

export async function unlockOfflineUser(
  email: string,
  password: string,
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  let match: OfflineLoginRecord | null = null;
  await offlineAuthStore.iterate<OfflineLoginRecord, void>((record) => {
    if (record.email === normalizedEmail) match = record;
  });
  if (!match) return null;

  const record = match as OfflineLoginRecord;
  const candidate = await deriveOfflineVerifier(
    password,
    fromBase64(record.salt),
    record.iterations,
  );
  const expected = fromBase64(record.verifier);
  if (candidate.length !== expected.length) return null;
  let difference = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    difference |= candidate[index] ^ expected[index];
  }
  if (difference !== 0) return null;

  await cacheUser(record.user);
  return record.user;
}

export function clearOfflineLogin(userId: string): Promise<void> {
  return offlineAuthStore.removeItem(userId);
}

async function persistSession(
  result: AuthResult,
  password?: string,
): Promise<User> {
  localStorage.setItem("bb_token", result.token);
  await cacheUser(result.user);
  if (password) {
    try {
      await rememberOfflineLogin(result.user, password);
    } catch {
      // Keep online sign-in available if IndexedDB or Web Crypto is unavailable.
    }
  }
  return result.user;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await api.post<ApiEnvelope<AuthResult>>("/auth/login", {
    email,
    password,
  });
  return persistSession(response.data.data, password);
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
  return persistSession(response.data.data, password);
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
