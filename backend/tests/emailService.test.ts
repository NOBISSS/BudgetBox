import { afterEach, describe, expect, it, vi } from "vitest";

const mailer = vi.hoisted(() => ({
  sendMail: vi.fn(),
  createTransport: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mailer.createTransport,
  },
}));

import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../src/services/emailService.js";

describe("email delivery", () => {
  afterEach(() => {
    mailer.sendMail.mockReset();
    mailer.createTransport.mockReset();
  });

  it("sends a welcome email with an escaped name and a sign-in link", async () => {
    mailer.sendMail.mockResolvedValue({ messageId: "welcome-id" });
    mailer.createTransport.mockReturnValue({ sendMail: mailer.sendMail });

    const delivered = await sendWelcomeEmail({
      name: "Riya <script>",
      email: "riya@example.com",
    });

    expect(delivered).toBe(true);
    expect(mailer.createTransport).toHaveBeenCalledOnce();
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "riya@example.com",
        subject: "Welcome to BudgetBox",
        text: expect.stringContaining("http://localhost:5173/login"),
        html: expect.stringContaining("Riya &lt;script&gt;"),
      }),
    );
  });

  it("sends a 15-minute password reset link to the frontend route", async () => {
    mailer.sendMail.mockResolvedValue({ messageId: "reset-id" });
    mailer.createTransport.mockReturnValue({ sendMail: mailer.sendMail });

    const delivered = await sendPasswordResetEmail(
      "riya@example.com",
      "a".repeat(64),
    );

    expect(delivered).toBe(true);
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "riya@example.com",
        subject: "Reset your BudgetBox password",
        text: expect.stringContaining(
          "http://localhost:5173/reset-password/" + "a".repeat(64),
        ),
        html: expect.stringContaining("expires in 15 minutes"),
      }),
    );
  });

  it("reports transport failures so reset tokens can be invalidated", async () => {
    mailer.sendMail.mockRejectedValue(new Error("SMTP unavailable"));
    mailer.createTransport.mockReturnValue({ sendMail: mailer.sendMail });

    await expect(
      sendPasswordResetEmail("riya@example.com", "b".repeat(64)),
    ).resolves.toBe(false);
  });
});
