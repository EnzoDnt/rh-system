import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail } from "../src/services/email.js";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: class { emails = { send: sendMock }; },
}));

beforeEach(() => {
  sendMock.mockReset();
  process.env.RESEND_API_KEY = "k";
});

describe("sendEmail", () => {
  it("sends with the expected from and html-wrapped body", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "msg_1" }, error: null });
    const out = await sendEmail({ to: "x@y", subject: "hello", body: "world" });
    expect(out.message_id).toBe("msg_1");
    const arg = sendMock.mock.calls[0][0];
    // BRAND_NAME peut être surchargée via env — le test vérifie le format générique
    expect(arg.from).toMatch(/L'équipe \S.*<.+@.+>/);
    expect(arg.html).toContain("<body>world</body>");
  });

  it("throws on Resend error", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(sendEmail({ to: "x", subject: "s", body: "b" })).rejects.toThrow(/boom/);
  });
});
