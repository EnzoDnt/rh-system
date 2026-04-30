import { Hono } from "hono";
import { eq, isNull, desc } from "drizzle-orm";
import { getDb, notifications } from "@rh/db";
import { Errors } from "../lib/http.js";

const db = getDb();

export const notificationsRouter = new Hono()

  // GET /api/notifications[?unread=true]
  .get("/", async (c) => {
    const unreadOnly = c.req.query("unread") === "true";
    const rows = await db
      .select()
      .from(notifications)
      .where(unreadOnly ? isNull(notifications.lue_at) : undefined)
      .orderBy(desc(notifications.created_at))
      .limit(100);
    return c.json(rows);
  })

  // POST /api/notifications/mark-all-read  — must be BEFORE /:id routes
  .post("/mark-all-read", async (c) => {
    const result = await db
      .update(notifications)
      .set({ lue_at: new Date().toISOString() })
      .where(isNull(notifications.lue_at));
    return c.json({ updated: (result as any).rowCount ?? 0 });
  })

  // POST /api/notifications/:id/mark-read
  .post("/:id/mark-read", async (c) => {
    const id = c.req.param("id");
    const [updated] = await db
      .update(notifications)
      .set({ lue_at: new Date().toISOString() })
      .where(eq(notifications.id, id))
      .returning();
    if (!updated) throw Errors.notFound("Notification");
    return c.json(updated);
  });
