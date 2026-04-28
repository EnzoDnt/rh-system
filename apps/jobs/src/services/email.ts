import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "L'équipe Recrutement <recrutement@your-domain.example>";

let cached: Resend | null = null;
function client() {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  cached = new Resend(key);
  return cached;
}

export async function sendEmail(input: { to: string; subject: string; body: string }): Promise<{ message_id: string }> {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${input.body.replace(/\n/g, "<br>")}</body></html>`;
  const { data, error } = await client().emails.send({
    from: FROM,
    to: input.to,
    subject: input.subject,
    html,
  });
  if (error || !data) throw new Error(error?.message ?? "Resend returned no data");
  return { message_id: data.id };
}
