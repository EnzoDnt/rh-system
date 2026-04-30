import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CriteresScoringSchema, RecommandationSchema, CommunicationTypeSchema } from "@rh/types";
import {
  runCriteresPrompt, runEmailPrompt, runFichePostePrompt,
} from "../services/claude.js";
import { determineEmailType } from "../services/claude-prompts.js";

const GenCriteresBody = z.object({
  titre: z.string().min(1),
  description: z.string().min(1),
  instructions: z.string().optional(),
});

const GenEmailBody = z.object({
  candidat_nom: z.string().min(1),
  candidat_email: z.string().email().optional(),
  poste_titre: z.string().min(1),
  score_global: z.number().min(0).max(100).nullable(),
  recommandation: RecommandationSchema.nullable(),
  type_email: CommunicationTypeSchema,
  rapport_ia: z.string().optional().default(""),
});

const RegenEmailBody = z.object({
  candidat_nom: z.string().min(1),
  candidat_email: z.string().email(),
  poste_titre: z.string().min(1),
  recommandation: RecommandationSchema,
  rapport_ia: z.string(),
  score_global: z.number(),
  feedback: z.string().min(1),
});

const GenFicheBody = z.object({
  titre: z.string().min(1),
  description: z.string().min(1),
  brief: z.string().optional(),
  formbricks_survey_id: z.string().optional(),
  feedback: z.string().optional(),
  current_html: z.string().optional(),
});

export const aiRouter = new Hono()

  .post("/generate-criteres", zValidator("json", GenCriteresBody), async (c) => {
    const out = await runCriteresPrompt(c.req.valid("json"));
    return c.json(out);
  })

  .post("/generate-email", zValidator("json", GenEmailBody), async (c) => {
    const body = c.req.valid("json");
    const emailType = body.type_email === "accuse_reception" ? "invitation" : body.type_email;
    const out = await runEmailPrompt({
      candidat_nom: body.candidat_nom,
      candidat_email: body.candidat_email ?? "",
      poste_titre: body.poste_titre,
      score_global: body.score_global,
      recommandation: body.recommandation,
      rapport_ia: body.rapport_ia,
      emailType: emailType as "invitation" | "refus" | "relance",
    });
    return c.json(out);
  })

  .post("/regenerate-email", zValidator("json", RegenEmailBody), async (c) => {
    const body = c.req.valid("json");
    const emailType = determineEmailType(body.recommandation);
    const out = await runEmailPrompt({
      candidat_nom: body.candidat_nom,
      candidat_email: body.candidat_email,
      poste_titre: body.poste_titre,
      score_global: body.score_global,
      recommandation: body.recommandation,
      rapport_ia: body.rapport_ia,
      emailType,
      feedback: body.feedback,
    });
    return c.json({ type: emailType, ...out });
  })

  .post("/generate-fiche-poste", zValidator("json", GenFicheBody), async (c) => {
    const html = await runFichePostePrompt(c.req.valid("json"));
    return c.text(html, 200, { "content-type": "text/html; charset=utf-8" });
  });
