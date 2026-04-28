import { sql } from "drizzle-orm";
import { getDb } from "../src/index.js";

async function main() {
  const db = getDb();
  const counts = await db.execute<{
    table: string; n: string;
  }>(sql`
    SELECT 'postes'           AS table, COUNT(*)::text AS n FROM postes
    UNION ALL SELECT 'candidatures',   COUNT(*)::text FROM candidatures
    UNION ALL SELECT 'scores',         COUNT(*)::text FROM scores
    UNION ALL SELECT 'communications', COUNT(*)::text FROM communications
    UNION ALL SELECT 'prompts',        COUNT(*)::text FROM prompts
    UNION ALL SELECT 'prompts_history',COUNT(*)::text FROM prompts_history
  `);

  const orphans = await db.execute<{
    issue: string; n: string;
  }>(sql`
    SELECT 'candidatures.poste_id orphan' AS issue, COUNT(*)::text AS n
      FROM candidatures c LEFT JOIN postes p ON c.poste_id = p.id
      WHERE p.id IS NULL
    UNION ALL
    SELECT 'scores.candidature_id orphan', COUNT(*)::text
      FROM scores s LEFT JOIN candidatures c ON s.candidature_id = c.id
      WHERE c.id IS NULL
    UNION ALL
    SELECT 'communications.candidature_id orphan', COUNT(*)::text
      FROM communications co LEFT JOIN candidatures c ON co.candidature_id = c.id
      WHERE c.id IS NULL
  `);

  console.log("=== Row counts ===");
  for (const r of counts) console.log(`  ${r.table.padEnd(18)} ${r.n}`);
  console.log("\n=== Orphans (must all be 0) ===");
  let bad = 0;
  for (const r of orphans) {
    console.log(`  ${r.issue.padEnd(40)} ${r.n}`);
    if (r.n !== "0") bad++;
  }
  if (bad > 0) {
    console.error(`\n✗ ${bad} integrity issue(s) — abort migration`);
    process.exit(2);
  }
  console.log("\n✓ Integrity OK");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
