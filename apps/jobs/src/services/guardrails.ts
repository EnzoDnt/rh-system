import {
  INVISIBLE_UNICODE, INJECTION_PATTERNS, HIDDEN_CSS_PATTERNS,
  BASE64_BLOCK, EXCESSIVE_WHITESPACE,
} from "./guardrails-patterns.js";
import { runGuardrailsPrompt } from "../lib/claude-from-api.js";

export type GuardrailsResult = {
  flagged: boolean;
  flag_motif: string | null;
  cleaned_cv: string;
  cleaned_reponses: Record<string, unknown>;
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyHeuristics(cv: string): { flagged: boolean; motifs: string[]; cleaned: string } {
  let cleaned = cv;
  const motifs: string[] = [];

  const invisibleMatches = cv.match(INVISIBLE_UNICODE);
  if (invisibleMatches && invisibleMatches.length > 5) {
    motifs.push(`Caractères Unicode invisibles (×${invisibleMatches.length})`);
    cleaned = cleaned.replace(INVISIBLE_UNICODE, "");
  }

  for (const { name, re } of INJECTION_PATTERNS) {
    if (re.test(cleaned)) {
      motifs.push(`Injection LLM : ${name}`);
      cleaned = cleaned.replace(re, "[CONTENU SUPPRIMÉ]");
    }
  }

  for (const { name, re } of HIDDEN_CSS_PATTERNS) {
    if (re.test(cleaned)) {
      motifs.push(`Style caché : ${name}`);
      cleaned = cleaned.replace(re, "[STYLE SUPPRIMÉ]");
    }
  }

  if (BASE64_BLOCK.test(cleaned)) {
    motifs.push("Bloc base64 suspect");
    cleaned = cleaned.replace(BASE64_BLOCK, "[CONTENU SUPPRIMÉ]");
  }

  if (EXCESSIVE_WHITESPACE.test(cleaned)) {
    motifs.push("Espacement excessif");
    cleaned = cleaned.replace(EXCESSIVE_WHITESPACE, " ");
  }

  return { flagged: motifs.length > 0, motifs, cleaned };
}

export async function runGuardrails(
  cvText: string,
  reponses: Record<string, unknown>,
): Promise<GuardrailsResult> {
  const cv = cvText ?? "";

  // Layer 1: free heuristics. If they flag, skip Claude.
  const h = applyHeuristics(cv);
  if (h.flagged) {
    return {
      flagged: true,
      flag_motif: h.motifs.join("; "),
      cleaned_cv: h.cleaned,
      cleaned_reponses: reponses,
    };
  }

  // Layer 2: Claude. On error, fail open (don't block legit candidates).
  let claudeResp;
  try {
    claudeResp = await runGuardrailsPrompt({ cv_text: cv, reponses });
  } catch {
    return { flagged: false, flag_motif: null, cleaned_cv: cv, cleaned_reponses: reponses };
  }
  if (!claudeResp.flagged) {
    return { flagged: false, flag_motif: null, cleaned_cv: cv, cleaned_reponses: reponses };
  }

  let cleanedCv = cv;
  const reponsesStr = JSON.stringify(reponses);
  let cleanedReponsesStr = reponsesStr;
  for (const seg of claudeResp.suspicious_segments) {
    if (!seg) continue;
    const re = new RegExp(escapeRe(seg), "g");
    cleanedCv = cleanedCv.replace(re, "[CONTENU SUPPRIMÉ]");
    cleanedReponsesStr = cleanedReponsesStr.replace(re, "[CONTENU SUPPRIMÉ]");
  }
  let cleanedReponses: Record<string, unknown>;
  try { cleanedReponses = JSON.parse(cleanedReponsesStr); } catch { cleanedReponses = reponses; }

  return {
    flagged: true,
    flag_motif: claudeResp.motif ?? "Détection IA",
    cleaned_cv: cleanedCv,
    cleaned_reponses: cleanedReponses,
  };
}
