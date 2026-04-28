import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";
import { loadEnv } from "@rh/config";

const env = loadEnv();
const sql = postgres(env.DATABASE_URL, { prepare: false, max: 1 });

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../migrations");

async function ensureMigrationsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
}

async function appliedSet(): Promise<Set<string>> {
  const rows = await sql<{ filename: string }[]>`SELECT filename FROM schema_migrations`;
  return new Set(rows.map((r) => r.filename));
}

async function main() {
  await ensureMigrationsTable();
  const applied = await appliedSet();
  const all = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const pending = all.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log("✓ No pending migrations");
    await sql.end();
    return;
  }
  for (const file of pending) {
    const content = await readFile(join(migrationsDir, file), "utf8");
    console.log(`→ Applying ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`INSERT INTO schema_migrations (filename) VALUES (${file})`;
    });
  }
  console.log(`✓ Applied ${pending.length} migration(s)`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
