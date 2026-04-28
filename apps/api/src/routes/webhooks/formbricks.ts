import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { enqueueIntake } from "../../services/queue-client.js";

const MAX_TIMESTAMP_DRIFT_SEC = 5 * 60;

function extractSurveyId(p: any): string | null {
  return p?.data?.surveyId ?? p?.surveyId ?? p?.survey_id ?? null;
}

function verifySignature(rawBody: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader) return false;
  const parts: Record<string, string> = {};
  for (const seg of sigHeader.split(",")) {
    const [k, ...rest] = seg.split("=");
    if (k && rest.length) parts[k.trim()] = rest.join("=").trim();
  }
  const ts = Number(parts.t);
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_TIMESTAMP_DRIFT_SEC) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  let expectedBuf: Buffer, givenBuf: Buffer;
  try {
    expectedBuf = Buffer.from(expected, "hex");
    givenBuf = Buffer.from(v1, "hex");
  } catch {
    return false;
  }
  if (expectedBuf.length !== givenBuf.length) return false;
  return timingSafeEqual(expectedBuf, givenBuf);
}

function verifyToken(token: string | null | undefined, secret: string): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const formbricksWebhookRouter = new Hono()
  .post("/", async (c) => {
    const rawBody = await c.req.text();
    const secret = process.env.FORMBRICKS_WEBHOOK_SECRET;
    if (secret) {
      // Path A: HMAC signature (preferred). Used when Formbricks ever supports webhook signing.
      const sigHeader = c.req.header("formbricks-signature") ?? c.req.header("Formbricks-Signature") ?? null;
      const hmacOk = verifySignature(rawBody, sigHeader, secret);
      // Path B: shared token in query param. Fallback because self-hosted Formbricks (≤ v3.x)
      // doesn't expose webhook signing or custom headers — the only way to authenticate is to
      // bake the secret into the configured URL: /webhooks/formbricks?token=<secret>
      const tokenOk = verifyToken(c.req.query("token"), secret);
      if (!hmacOk && !tokenOk) {
        return c.json({ error: "Signature invalide ou absente", code: "INVALID_SIGNATURE" }, 401);
      }
    }
    let payload: unknown;
    try { payload = JSON.parse(rawBody); } catch { payload = null; }
    if (!payload || typeof payload !== "object") {
      return c.json({ error: "Payload JSON manquant ou invalide", code: "INVALID_PAYLOAD" }, 400);
    }
    if (!extractSurveyId(payload)) {
      return c.json({ error: "Champ surveyId manquant dans le payload Formbricks", code: "MISSING_SURVEY_ID" }, 400);
    }
    const job = await enqueueIntake(payload);
    return c.json({ ok: true, job_id: job.id }, 202);
  });
