async function calFetch(path: string, init?: RequestInit) {
  const token = process.env.CALENDLY_TOKEN;
  if (!token) throw new Error("CALENDLY_TOKEN not set");
  const r = await fetch(`https://api.calendly.com${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`Calendly ${r.status}: ${await r.text()}`);
  return r.json() as Promise<any>;
}

export async function listEventTypes() {
  const me = await calFetch("/users/me");
  const userUri = me.resource.uri;
  const list = await calFetch(`/event_types?user=${encodeURIComponent(userUri)}&active=true&count=100`);
  return list.collection.map((e: any) => ({
    uri: e.uri, name: e.name, duration: e.duration, scheduling_url: e.scheduling_url,
  }));
}

export async function createSchedulingLink(eventTypeUri: string) {
  const out = await calFetch("/scheduling_links", {
    method: "POST",
    body: JSON.stringify({ max_event_count: 1, owner: eventTypeUri, owner_type: "EventType" }),
  });
  return out.resource.booking_url as string;
}
