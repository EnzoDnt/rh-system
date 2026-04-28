import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, prompts } from "@rh/db";
import {
  ScoringResponseSchema, EmailResponseSchema, GuardrailsResponseSchema,
  type ScoringResponse, type EmailResponse, type GuardrailsResponse,
} from "@rh/types";
import {
  scoringUserPrompt, emailUserPrompt, criteresUserPrompt,
  fichePosteUserPrompt, formulaireUserPrompt,
} from "./claude-prompts.js";
import { logAiCall } from "../lib/anthropic-cost.js";

const db = getDb();

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  cached = new Anthropic({ apiKey: key, maxRetries: 3 });
  return cached;
}

async function loadPrompt(type: string): Promise<{ system_prompt: string; model: string }> {
  const [row] = await db.select({ system_prompt: prompts.system_prompt, model: prompts.model })
    .from(prompts).where(eq(prompts.type, type));
  if (!row) throw new Error(`Prompt type=${type} not found in DB`);
  return row;
}

// --- SCORING (tool use) ---
export async function runScoringPrompt(opts: {
  systemPrompt?: string;
  model?: string;
  poste_description: string;
  criteres: Record<string, { poids: number; description: string }>;
  cv_text: string | null;
  reponses: Record<string, unknown>;
  linkedin_data: unknown | null;
}): Promise<ScoringResponse> {
  const { system_prompt, model } = opts.systemPrompt && opts.model
    ? { system_prompt: opts.systemPrompt, model: opts.model }
    : await loadPrompt("scoring_candidat");

  const response = await client().messages.create({
    model,
    max_tokens: 4096,
    system: [{ type: "text", text: system_prompt, cache_control: { type: "ephemeral" } }] as any,
    messages: [{ role: "user", content: scoringUserPrompt(opts) }],
    tools: [{
      name: "submit_score",
      description: "Soumet le score d'évaluation du candidat",
      input_schema: {
        type: "object",
        properties: {
          score_global:    { type: "number", minimum: 0, maximum: 100 },
          scores_details:  { type: "object", additionalProperties: { type: "number", minimum: 0, maximum: 100 } },
          rapport_ia:      { type: "string" },
          recommandation:  { type: "string", enum: ["retenir", "a_voir", "refuser"] },
        },
        required: ["score_global", "scores_details", "rapport_ia", "recommandation"],
      },
    }],
    tool_choice: { type: "tool", name: "submit_score" },
  });
  logAiCall({ prompt_type: "scoring_candidat", model: response.model, usage: response.usage as any }).catch((e) => console.error("logAiCall failed:", e));

  const block = response.content.find((b: any) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("Claude did not return a tool_use block");
  return ScoringResponseSchema.parse(block.input);
}

// --- EMAIL (tool use) ---
export async function runEmailPrompt(opts: {
  candidat_nom: string;
  candidat_email: string;
  poste_titre: string;
  score_global: number | null;
  recommandation: "retenir" | "a_voir" | "refuser" | null;
  rapport_ia: string;
  emailType: "invitation" | "refus" | "relance";
  feedback?: string | null;
}): Promise<EmailResponse> {
  const { system_prompt, model } = await loadPrompt("generation_email");
  const response = await client().messages.create({
    model,
    max_tokens: 2048,
    system: [{ type: "text", text: system_prompt, cache_control: { type: "ephemeral" } }] as any,
    messages: [{ role: "user", content: emailUserPrompt(opts) }],
    tools: [{
      name: "submit_email",
      description: "Soumet le brouillon d'email",
      input_schema: {
        type: "object",
        properties: { sujet: { type: "string" }, contenu: { type: "string" } },
        required: ["sujet", "contenu"],
      },
    }],
    tool_choice: { type: "tool", name: "submit_email" },
  });
  logAiCall({ prompt_type: "generation_email", model: response.model, usage: response.usage as any }).catch((e) => console.error("logAiCall failed:", e));
  const block = response.content.find((b: any) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("Claude did not return a tool_use block");
  return EmailResponseSchema.parse(block.input);
}

// --- GUARDRAILS (Claude layer 2) ---
export async function runGuardrailsPrompt(input: { cv_text: string; reponses: Record<string, unknown> }): Promise<GuardrailsResponse> {
  const { system_prompt, model } = await loadPrompt("guardrails");
  const response = await client().messages.create({
    model,
    max_tokens: 1024,
    system: [{ type: "text", text: system_prompt, cache_control: { type: "ephemeral" } }] as any,
    messages: [{ role: "user", content: `Contenu à analyser :\n${JSON.stringify(input, null, 2)}` }],
    tools: [{
      name: "submit_guardrails",
      input_schema: {
        type: "object",
        properties: {
          flagged: { type: "boolean" },
          motif: { type: ["string", "null"] },
          suspicious_segments: { type: "array", items: { type: "string" } },
        },
        required: ["flagged", "motif", "suspicious_segments"],
      },
    }],
    tool_choice: { type: "tool", name: "submit_guardrails" },
  });
  logAiCall({ prompt_type: "guardrails", model: response.model, usage: response.usage as any }).catch((e) => console.error("logAiCall failed:", e));
  const block = response.content.find((b: any) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return { flagged: false, motif: null, suspicious_segments: [] };
  return GuardrailsResponseSchema.parse(block.input);
}

// --- CRITÈRES (tool use) ---
export async function runCriteresPrompt(input: { titre: string; description: string; instructions?: string }) {
  const { system_prompt, model } = await loadPrompt("generation_criteres");
  const response = await client().messages.create({
    model, max_tokens: 1024,
    system: [{ type: "text", text: system_prompt, cache_control: { type: "ephemeral" } }] as any,
    messages: [{ role: "user", content: criteresUserPrompt(input) }],
    tools: [{
      name: "submit_criteres",
      input_schema: {
        type: "object",
        additionalProperties: {
          type: "object",
          properties: { poids: { type: "number" }, description: { type: "string" } },
          required: ["poids", "description"],
        },
      },
    }],
    tool_choice: { type: "tool", name: "submit_criteres" },
  });
  logAiCall({ prompt_type: "generation_criteres", model: response.model, usage: response.usage as any }).catch((e) => console.error("logAiCall failed:", e));
  const block = response.content.find((b: any) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("Claude did not return a tool_use block");
  return block.input as Record<string, { poids: number; description: string }>;
}

// --- FICHE DE POSTE (raw HTML) ---
export async function runFichePostePrompt(input: {
  titre: string; description: string; brief?: string;
  formbricks_survey_id?: string; feedback?: string; current_html?: string;
}): Promise<string> {
  const { system_prompt, model } = await loadPrompt("generation_fiche_poste");
  const response = await client().messages.create({
    model, max_tokens: 4096,
    system: [{ type: "text", text: system_prompt, cache_control: { type: "ephemeral" } }] as any,
    messages: [{ role: "user", content: fichePosteUserPrompt(input) }],
  });
  logAiCall({ prompt_type: "generation_fiche_poste", model: response.model, usage: response.usage as any }).catch((e) => console.error("logAiCall failed:", e));
  const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const match = text.match(/<!DOCTYPE[\s\S]*<\/html>/i);
  return match ? match[0] : text;
}

// --- FORMULAIRE (raw JSON array) ---
export async function runFormulairePrompt(input: {
  poste_titre: string; poste_description: string;
  criteres: Record<string, { poids: number; description: string }>;
}) {
  const { system_prompt, model } = await loadPrompt("generation_formulaire");
  const response = await client().messages.create({
    model, max_tokens: 4096,
    system: [{ type: "text", text: system_prompt, cache_control: { type: "ephemeral" } }] as any,
    messages: [{ role: "user", content: formulaireUserPrompt(input) }],
  });
  logAiCall({ prompt_type: "generation_formulaire", model: response.model, usage: response.usage as any }).catch((e) => console.error("logAiCall failed:", e));
  const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Claude did not return a JSON array");
  return JSON.parse(match[0]) as Array<Record<string, unknown>>;
}
