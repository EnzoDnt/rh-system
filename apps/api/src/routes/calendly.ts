import { Hono } from "hono";
import { listEventTypes } from "../services/calendly.js";

export const calendlyRouter = new Hono()
  .get("/events", async (c) => {
    const events = await listEventTypes();
    return c.json(events);
  });
