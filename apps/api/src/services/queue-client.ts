// pg-boss producer. The consumer (worker) lives in apps/jobs (Plan D).
// pg-boss persists jobs in Postgres → no new infra. The same DB powers the API,
// so we never need a separate Redis/SaaS for orchestration.
//
// In tests we mock this entire module via vitest — no live DB connection needed.

import PgBoss from "pg-boss";
import { loadEnv } from "@rh/config";

export const QUEUE_INTAKE = "intake";
export const QUEUE_INTAKE_INTERNAL = "intake-internal";
export const QUEUE_SCORING = "scoring";
export const QUEUE_COMMUNICATION = "communication";

let cached: PgBoss | null = null;
let starting: Promise<PgBoss> | null = null;

async function getBoss(): Promise<PgBoss> {
  if (cached) return cached;
  if (starting) return starting;
  const env = loadEnv();
  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: "pgboss",
    application_name: "rh-api",
  });
  starting = boss.start().then(async () => {
    // pg-boss v10 requires queues to exist before send/work. Idempotent.
    await Promise.all([
      boss.createQueue(QUEUE_INTAKE),
      boss.createQueue(QUEUE_INTAKE_INTERNAL),
      boss.createQueue(QUEUE_SCORING),
      boss.createQueue(QUEUE_COMMUNICATION),
    ]);
    cached = boss;
    starting = null;
    return boss;
  });
  return starting;
}

export async function enqueueScoring(candidature_id: string): Promise<{ id: string }> {
  const boss = await getBoss();
  const id = await boss.send(QUEUE_SCORING, { candidature_id }, {
    retryLimit: 2, retryBackoff: true, expireInHours: 1,
  });
  if (!id) throw new Error("pg-boss send returned null id");
  return { id };
}

export async function enqueueCommunication(communication_id: string): Promise<{ id: string }> {
  const boss = await getBoss();
  const id = await boss.send(QUEUE_COMMUNICATION, { communication_id }, {
    retryLimit: 3, retryBackoff: true, expireInHours: 1,
  });
  if (!id) throw new Error("pg-boss send returned null id");
  return { id };
}

export async function enqueueIntake(payload: unknown): Promise<{ id: string }> {
  const boss = await getBoss();
  const id = await boss.send(QUEUE_INTAKE, payload as object, {
    retryLimit: 3, retryBackoff: true, expireInHours: 1,
  });
  if (!id) throw new Error("pg-boss send returned null id");
  return { id };
}

export async function enqueueInternalIntake(candidature_id: string): Promise<{ id: string }> {
  const boss = await getBoss();
  const id = await boss.send(QUEUE_INTAKE_INTERNAL, { candidature_id }, {
    retryLimit: 3, retryBackoff: true, expireInHours: 1,
  });
  if (!id) throw new Error("pg-boss send returned null id");
  return { id };
}

export async function stopQueueClient() {
  if (cached) { await cached.stop({ graceful: true, timeout: 5000 }); cached = null; }
}
