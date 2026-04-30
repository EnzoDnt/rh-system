import { Hono } from "hono";

export const configRouter = new Hono()
  .get("/", (c) => {
    return c.json({
      resend_enabled: Boolean(process.env.RESEND_API_KEY?.trim()),
    });
  });
