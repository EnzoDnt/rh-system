type LinkedinData = {
  name: string; headline: string; summary: string; location: string;
  experience: unknown[]; education: unknown[]; skills: string[];
  languages: string[]; certifications: unknown[];
  profileUrl: string; profilePicture: string; connectionCount: number | null;
};

export async function scrapeLinkedin(url: string): Promise<{ data: LinkedinData } | null> {
  if (!url.includes("linkedin.com/in/")) return null;
  const key = process.env.APIFY_API_KEY;
  if (!key) throw new Error("APIFY_API_KEY not set");

  const r = await fetch(
    `https://api.apify.com/v2/acts/dev_fusion~Linkedin-Profile-Scraper/run-sync-get-dataset-items?token=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileUrls: [url] }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!r.ok) return null;
  const items = (await r.json()) as any[];
  if (!items?.length) return null;
  const p = items[0];

  return { data: {
    name: p.fullName ?? p.name ?? "",
    headline: p.headline ?? "",
    summary: p.summary ?? p.about ?? "",
    location: p.addressWithCountry ?? p.location ?? "",
    experience: p.experiences ?? p.experience ?? [],
    education: p.educations ?? p.education ?? [],
    skills: p.skills ?? [],
    languages: p.languages ?? [],
    certifications: p.certifications ?? [],
    profileUrl: p.linkedinUrl ?? url,
    profilePicture: p.profilePic ?? p.profilePicture ?? "",
    connectionCount: p.connections ?? p.connectionCount ?? null,
  }};
}
