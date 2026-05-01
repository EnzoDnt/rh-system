import { supabase } from "./supabase.js";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public issues?: unknown) {
    super(message);
  }
}

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const { data: { session } } = await supabase.auth.getSession();
  const finalHeaders: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
  if (session?.access_token) finalHeaders["Authorization"] = `Bearer ${session.access_token}`;
  if (json !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    rest.body = JSON.stringify(json);
  }
  const res = await fetch(`${BASE}${path}`, { ...rest, headers: finalHeaders });
  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => ({} as any));
      // Canonical shape: { error: string, code?: string, issues?: any }
      // Defensive shape: zValidator (default) returns { success: false, error: { issues: [...] } }
      // → flatten the nested issues so the toast never ends up as "[object Object]".
      const issues = body.issues ?? body.error?.issues;
      let message: string = typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
      if (Array.isArray(issues) && issues.length > 0) {
        const detail = issues
          .map((i: any) => `${(i.path ?? []).join(".") || "(root)"} — ${i.message}`)
          .join("; ");
        message = `Validation échouée : ${detail}`;
      }
      throw new ApiError(res.status, message, body.code, issues);
    }
    throw new ApiError(res.status, `HTTP ${res.status}`);
  }
  if (contentType.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}
