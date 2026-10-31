import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  welcome: vi.fn(),
}));

vi.mock("../src/config/redis.js", () => ({ redis: {} }));
vi.mock("../src/models/User.js", () => ({
  UserModel: { findOne: mocks.findOne, create: mocks.create },
}));
vi.mock("../src/services/emailService.js", () => ({
  sendWelcomeEmail: mocks.welcome,
  sendPasswordResetEmail: vi.fn(),
}));

import { loginWithGoogle } from "../src/services/authService.js";

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Google authorization-code sign-in", () => {
  beforeEach(() => {
    mocks.findOne.mockReset();
    mocks.create.mockReset();
    mocks.welcome.mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges the code with backend credentials and creates a session", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ access_token: "access-token" }))
      .mockResolvedValueOnce(
        jsonResponse({
          sub: "google-subject",
          email: "google@example.com",
          email_verified: true,
          name: "Google User",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mocks.findOne.mockImplementation(() => ({
      select: async () => null,
    }));
    mocks.create.mockImplementation(
      async (newUser: Record<string, string>) => ({
        ...newUser,
        _id: "user-object-id",
      }),
    );

    const result = await loginWithGoogle(
      "single-use-code",
      "http://localhost:5173",
    );

    expect(result.user).toEqual({
      id: "user-object-id",
      name: "Google User",
      email: "google@example.com",
    });
    expect(result.token).toEqual(expect.any(String));
    const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
    expect(requestBody).toBeInstanceOf(URLSearchParams);
    expect((requestBody as URLSearchParams).get("redirect_uri")).toBe(
      "http://localhost:5173",
    );
    expect((requestBody as URLSearchParams).get("client_secret")).toBe(
      "google-test-client-secret",
    );
    expect(mocks.create).toHaveBeenCalledWith({
      name: "Google User",
      email: "google@example.com",
      googleId: "google-subject",
    });
    expect(mocks.welcome).toHaveBeenCalledOnce();
  });

  it("does not create an account for an unverified Google email", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse({ access_token: "access-token" }))
        .mockResolvedValueOnce(
          jsonResponse({
            sub: "unverified-subject",
            email: "unverified@example.com",
            email_verified: false,
          }),
        ),
    );

    await expect(
      loginWithGoogle("single-use-code", "http://localhost:5173"),
    ).rejects.toMatchObject({
      code: "GOOGLE_EMAIL_UNVERIFIED",
      statusCode: 401,
    });
    expect(mocks.findOne).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
