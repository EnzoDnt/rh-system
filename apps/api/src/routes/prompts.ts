import { Hono } from "hono";
import { zv } from "../lib/zv.js";
import { z } from "zod";
import { eq, sql, desc, and } from "drizzle-orm";
import { getDb, prompts, promptsHistory } from "@rh/db";
import { Errors } from "../lib/http.js";

const db = getDb();

const PatchBody = z.object({
  system_prompt: z.string().trim().min(1),
  model: z.string().min(1),
});

const RestoreBody = z.object({ history_id: z.string().uuid() });

export const promptsRouter = new Hono()

  .get("/", async (c) => {
    const rows = await db.select({
      id: prompts.id, nom: prompts.nom, type: prompts.type,
      model: prompts.model, version: prompts.version, updated_at: prompts.updated_at,
    }).from(prompts).orderBy(prompts.nom);
    return c.json(rows);
  })

  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const [p] = await db.select().from(prompts).where(eq(prompts.id, id));
    if (!p) throw Errors.notFound("Prompt");
    const history = await db.select({
      id: promptsHistory.id, version: promptsHistory.version,
      model: promptsHistory.model, created_at: promptsHistory.created_at,
    }).from(promptsHistory).where(eq(promptsHistory.prompt_id, id))
      .orderBy(desc(promptsHistory.version));
    return c.json({ ...p, history });
  })

  .patch("/:id", zv("json", PatchBody), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(prompts).where(eq(prompts.id, id));
      if (!current) throw Errors.notFound("Prompt");
      await tx.insert(promptsHistory).values({
        prompt_id: id,
        system_prompt: current.system_prompt,
        model: current.model,
        version: current.version,
      });
      const [updated] = await tx.update(prompts).set({
        system_prompt: body.system_prompt,
        model: body.model,
        version: current.version + 1,
      }).where(eq(prompts.id, id)).returning({ version: prompts.version });
      return c.json({ success: true, version: updated!.version });
    });
  })

  .post("/:id/restore", zv("json", RestoreBody), async (c) => {
    const id = c.req.param("id");
    const { history_id } = c.req.valid("json");
    return await db.transaction(async (tx) => {
      const [hist] = await tx.select().from(promptsHistory)
        .where(and(eq(promptsHistory.id, history_id), eq(promptsHistory.prompt_id, id)));
      if (!hist) throw Errors.notFound("Version d'historique");
      const [current] = await tx.select().from(prompts).where(eq(prompts.id, id));
      if (!current) throw Errors.notFound("Prompt");
      await tx.insert(promptsHistory).values({
        prompt_id: id,
        system_prompt: current.system_prompt,
        model: current.model,
        version: current.version,
      });
      const [updated] = await tx.update(prompts).set({
        system_prompt: hist.system_prompt,
        model: hist.model,
        version: current.version + 1,
      }).where(eq(prompts.id, id)).returning({ version: prompts.version });
      return c.json({ success: true, version: updated!.version });
    });
  });
