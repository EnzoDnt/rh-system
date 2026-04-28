import type { MiddlewareHandler } from "hono";

export function logger(): MiddlewareHandler {
  return async (c, next) => {
    const t0 = performance.now();
    await next();
    const ms = Math.round(performance.now() - t0);
    const line = `${c.req.method} ${new URL(c.req.url).pathname} → ${c.res.status} (${ms}ms)`;
    if (c.res.status >= 500) console.error(line);
    else console.log(line);
  };
}
