import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(url: string): Promise<{ text: string } | null> {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) return null;
  const ct = r.headers.get("content-type") ?? "";
  if (!ct.includes("application/pdf") && !ct.includes("application/octet-stream")) {
    return null;
  }
  const buffer = new Uint8Array(await r.arrayBuffer());
  const pdf = await getDocumentProxy(buffer);
  const { text } = await extractText(pdf, { mergePages: true });
  return { text: text.trim() };
}
