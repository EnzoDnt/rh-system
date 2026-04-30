import PgBoss from "pg-boss";
import { loadEnv } from "@rh/config";
import { registerInternalIntake } from "./handlers/intake-internal.js";
import { registerScoring } from "./handlers/scoring.js";
import { registerCommunication } from "./handlers/communication.js";
import { registerHeartbeat } from "./handlers/heartbeat.js";
async function main() {
  const env = loadEnv();
  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: "pgboss",
    application_name: "rh-worker",
  });

  boss.on("error", (err) => console.error("pg-boss error:", err));

  await boss.start();
  console.log("✓ pg-boss started, schema=pgboss");

  await registerInternalIntake(boss);
  await registerScoring(boss);
  await registerCommunication(boss);
  await registerHeartbeat(boss);
  console.log("✓ handlers registered: intake-internal, scoring, communication, heartbeat");

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, async () => {
      console.log(`→ ${sig} — stopping pg-boss…`);
      await boss.stop({ graceful: true, timeout: 10_000 });
      process.exit(0);
    });
  }
}

main().catch((e) => { console.error("worker boot failed:", e); process.exit(1); });
