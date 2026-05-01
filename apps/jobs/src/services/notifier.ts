import { getDb, notifications } from "@rh/db";

const db = getDb();
const BRAND = process.env.BRAND_NAME?.trim() || "Recrutement";

async function persistNotification(n: {
  type: string;
  severity: "info" | "warn" | "error";
  titre: string;
  message: string;
  contexte?: Record<string, unknown>;
}) {
  try {
    await db.insert(notifications).values({
      type: n.type,
      severity: n.severity,
      titre: n.titre,
      message: n.message,
      contexte: n.contexte ?? null,
    });
  } catch {
    // Swallow DB errors — notifier must never crash the caller
  }
}

async function postExternal(message: string) {
  if (process.env.SLACK_WEBHOOK_URL?.trim()) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    }).catch(() => {});
    return;
  }
  if (process.env.NTFY_TOPIC?.trim()) {
    await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, { method: "POST", body: message }).catch(() => {});
  }
}

export async function notifyJobFailure(input: { queue: string; job_id: string; error: string }) {
  await persistNotification({
    type: "job_failure",
    severity: "error",
    titre: `Échec ${input.queue}`,
    message: `Job ${input.job_id} échoué après retries : ${input.error}`,
    contexte: input,
  });
  await postExternal(`🚨 ${BRAND} — queue=${input.queue} job=${input.job_id} → ${input.error}`);
}

export async function notifyHeartbeat() {
  await persistNotification({
    type: "heartbeat",
    severity: "info",
    titre: "Worker alive",
    message: "Heartbeat horaire OK",
  });
  await postExternal(`${BRAND} — heartbeat horaire OK (worker alive)`);
}
