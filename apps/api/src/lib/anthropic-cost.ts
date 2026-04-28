import { getDb, aiCalls } from "@rh/db";

// Anthropic per-million-token prices in USD (April 2026). Update when Anthropic publishes new pricing.
const USD_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 0.8, output: 4 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  "claude-opus-4-7": { input: 15, output: 75 },
};
const USD_TO_EUR = 0.92;
const CACHE_READ_DISCOUNT = 0.1; // cache reads cost 10% of input

export interface AiUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export function computeCostEur(model: string, usage: AiUsage): number {
  const price = USD_PER_MTOK[model];
  if (!price) return 0;
  const inUsd =
    ((usage.input_tokens ?? 0) * price.input +
      (usage.cache_creation_input_tokens ?? 0) * price.input +
      (usage.cache_read_input_tokens ?? 0) * price.input * CACHE_READ_DISCOUNT) /
    1_000_000;
  const outUsd = ((usage.output_tokens ?? 0) * price.output) / 1_000_000;
  return Number(((inUsd + outUsd) * USD_TO_EUR).toFixed(6));
}

export interface LogAiCallInput {
  prompt_type: string;
  model: string;
  usage: AiUsage;
  candidature_id?: string | null;
  poste_id?: string | null;
}

export async function logAiCall(input: LogAiCallInput): Promise<void> {
  const db = getDb();
  const cost_eur = computeCostEur(input.model, input.usage);
  await db.insert(aiCalls).values({
    prompt_type: input.prompt_type,
    model: input.model,
    input_tokens: input.usage.input_tokens ?? 0,
    output_tokens: input.usage.output_tokens ?? 0,
    cache_creation_tokens: input.usage.cache_creation_input_tokens ?? 0,
    cache_read_tokens: input.usage.cache_read_input_tokens ?? 0,
    cost_eur: cost_eur.toFixed(6),
    candidature_id: input.candidature_id ?? null,
    poste_id: input.poste_id ?? null,
  });
}
