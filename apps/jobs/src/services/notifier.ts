const NTFY_TOPIC = process.env.NTFY_TOPIC ?? "recruit-os-errors";
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

async function post(message: string) {
  if (SLACK_WEBHOOK) {
    await fetch(SLACK_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
    return;
  }
  await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, { method: "POST", body: message });
}

export async function notifyJobFailure(input: { queue: string; job_id: string; error: string }) {
  await post(`🚨 Recrutement — queue=${input.queue} job=${input.job_id} → ${input.error}`);
}

export async function notifyHeartbeat() {
  await post("Recrutement — heartbeat horaire OK (worker alive)");
}
