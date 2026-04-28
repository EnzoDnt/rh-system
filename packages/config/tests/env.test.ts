import { describe, it, expect } from "vitest";
import { loadEnv } from "../src/env";

describe("loadEnv", () => {
  it("throws when DATABASE_URL is missing", () => {
    expect(() => loadEnv({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });

  it("returns parsed env when all required vars are present", () => {
    const env = loadEnv({
      DATABASE_URL: "postgres://x:y@h:5432/d",
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      ANTHROPIC_API_KEY: "sk-ant-xxx",
    } as NodeJS.ProcessEnv);
    expect(env.DATABASE_URL).toBe("postgres://x:y@h:5432/d");
    expect(env.SUPABASE_URL).toBe("https://x.supabase.co");
  });
});
