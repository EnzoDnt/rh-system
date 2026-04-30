import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Lazy Supabase client initialization to avoid errors when env vars are not set
// (e.g., in test environments or CI where Supabase Storage is not available).
let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for file uploads");
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

const BodySchema = z.object({
  filename: z.string().min(1).max(200),
});

export const publicUploadUrlRouter = new Hono()

  // POST /api/public/upload-url/:slug
  // Generates a Supabase Storage signed upload URL for a CV PDF.
  // Flow:
  //   1. Frontend calls this endpoint → receives { upload_url, file_url, path }
  //   2. Frontend uploads the PDF directly to upload_url (PUT request)
  //   3. Frontend submits the form with cv_pdf: file_url
  .post("/:slug", async (c) => {
    const slug = c.req.param("slug");

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      return c.json({ error: "Corps de la requête invalide (JSON attendu)" }, 400);
    }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0]?.message ?? "Payload invalide" }, 400);
    }

    // Sanitize filename: only keep safe chars, must be PDF
    const sanitized = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!sanitized.toLowerCase().endsWith(".pdf")) {
      return c.json({ error: "Seuls les fichiers PDF sont acceptés" }, 400);
    }

    const path = `${slug}/${Date.now()}-${sanitized}`;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = getSupabase();
    } catch (e: any) {
      return c.json({ error: e.message }, 500);
    }

    const { data, error } = await supabase.storage.from("cvs").createSignedUploadUrl(path);
    if (error || !data) {
      return c.json({ error: error?.message ?? "Impossible de générer le lien d'upload" }, 500);
    }

    const { data: publicData } = supabase.storage.from("cvs").getPublicUrl(path);

    return c.json({
      upload_url: data.signedUrl,
      file_url: publicData.publicUrl,
      path,
    });
  });
