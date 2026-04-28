import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type DB = PostgresJsDatabase<typeof schema>;

let cached: DB | null = null;

export function getDb(databaseUrl?: string): DB {
  if (cached) return cached;
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { prepare: false, max: 10 });
  cached = drizzle(client, { schema });
  return cached;
}

export { schema };
