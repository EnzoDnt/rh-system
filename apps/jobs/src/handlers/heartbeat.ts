import type PgBoss from "pg-boss";
import { notifyHeartbeat } from "../services/notifier.js";

const QUEUE = "heartbeat";

export async function registerHeartbeat(boss: PgBoss) {
  await boss.createQueue(QUEUE);
  await boss.schedule(QUEUE, "0 * * * *", {}, { tz: "Europe/Paris" });
  await boss.work(QUEUE, { batchSize: 1 }, async (_jobs) => {
    await notifyHeartbeat();
  });
}
