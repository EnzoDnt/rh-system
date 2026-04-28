# Étendre l'API et ajouter des jobs

Cookbook pour ajouter de nouvelles routes ou de nouveaux jobs queue. Exemple : ajouter une route et un job qui envoie un **rappel automatique J+7** aux candidats sans réponse.

## Ajouter une route API

### 1. Créer le router

`apps/api/src/routes/relances.ts` :

```typescript
import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { getDb } from "@rh/db";
import { Errors } from "../lib/http.js";
import { enqueueRelance } from "../services/queue-client.js";

const db = getDb();

export const relancesRouter = new Hono()
  .post("/trigger-bulk", async (c) => {
    // Trouve les candidatures où l'invitation a été envoyée il y a 7+ jours et statut toujours "entretien"
    const rows = await db.execute<any>(sql`
      SELECT co.candidature_id
      FROM communications co
      WHERE co.type = 'invitation'
        AND co.statut = 'envoye'
        AND co.envoye_at < now() - interval '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM communications co2
          WHERE co2.candidature_id = co.candidature_id
            AND co2.type = 'relance'
        )
    `);
    const ids = Array.from(rows).map((r: any) => r.candidature_id);
    for (const id of ids) await enqueueRelance(id);
    return c.json({ enqueued: ids.length, candidature_ids: ids });
  });
```

### 2. Mount le router

Dans `apps/api/src/routes/index.ts` :

```typescript
import { relancesRouter } from "./relances.js";

export function mountRoutes(app: Hono, opts: { authMiddleware: MiddlewareHandler }) {
  // ...routes existantes...
  app.use("/api/relances/*", opts.authMiddleware);
  app.route("/api/relances", relancesRouter);
}
```

### 3. Tester

`apps/api/tests/relances.test.ts` :

```typescript
import { describe, it, expect, vi } from "vitest";
import { buildTestApp } from "./helpers/app-fixture.js";

vi.mock("../src/services/queue-client.js", () => ({
  enqueueScoring: vi.fn(), enqueueCommunication: vi.fn(), enqueueIntake: vi.fn(),
  enqueueRelance: vi.fn(async () => ({ id: "test-job" })),
}));

describe("POST /api/relances/trigger-bulk", () => {
  it("returns enqueued count", async () => {
    const app = buildTestApp();
    const res = await app.request("/api/relances/trigger-bulk", { method: "POST" });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body).toHaveProperty("enqueued");
  });
});
```

## Ajouter un job pg-boss

### 1. Créer la queue + le helper enqueue

Dans `apps/api/src/services/queue-client.ts` :

```typescript
export const QUEUE_RELANCE = "relance";

// Dans getBoss() / starting Promise, ajoute la création :
await Promise.all([
  boss.createQueue(QUEUE_INTAKE),
  boss.createQueue(QUEUE_SCORING),
  boss.createQueue(QUEUE_COMMUNICATION),
  boss.createQueue(QUEUE_RELANCE),  // nouveau
]);

export async function enqueueRelance(candidature_id: string) {
  const boss = await getBoss();
  const id = await boss.send(QUEUE_RELANCE, { candidature_id }, {
    retryLimit: 2, retryBackoff: true, expireInHours: 24,
  });
  if (!id) throw new Error("pg-boss send returned null id");
  return { id };
}
```

### 2. Créer le handler côté worker

`apps/jobs/src/handlers/relance.ts` :

```typescript
import type PgBoss from "pg-boss";
import { eq } from "drizzle-orm";
import { db } from "../services/shared.js";
import { candidatures, postes, scores, communications } from "@rh/db";
import { runEmailPrompt } from "../lib/claude-from-api.js";
import { sendEmail } from "../services/email.js";
import { notifyJobFailure } from "../services/notifier.js";

async function processRelance(input: { candidature_id: string }) {
  const id = input.candidature_id;
  const [row] = await db.execute<any>(sql`
    SELECT c.*, p.titre as poste_titre, s.rapport_ia, s.score_global, s.recommandation
    FROM candidatures c
    JOIN postes p ON p.id = c.poste_id
    LEFT JOIN scores s ON s.candidature_id = c.id
    WHERE c.id = ${id}
  `);
  if (!row) throw new Error(`Candidature ${id} not found`);

  const out = await runEmailPrompt({
    candidat_nom: row.nom,
    candidat_email: row.email,
    poste_titre: row.poste_titre,
    score_global: row.score_global,
    recommandation: row.recommandation,
    rapport_ia: row.rapport_ia,
    emailType: "relance",
  });

  // Insert dans communications + envoie tout de suite
  const [comm] = await db.insert(communications).values({
    candidature_id: id, type: "relance", sujet: out.sujet, contenu: out.contenu, statut: "valide",
  }).returning();

  await sendEmail({ to: row.email, subject: out.sujet, html: out.contenu, text: out.contenu });
  await db.update(communications).set({ statut: "envoye", envoye_at: new Date().toISOString() }).where(eq(communications.id, comm.id));
}

export async function registerRelance(boss: PgBoss) {
  await boss.createQueue("relance");
  await boss.work<{ candidature_id: string }>("relance", { batchSize: 3, includeMetadata: true } as any, async (jobs: any[]) => {
    for (const job of jobs) {
      try {
        await processRelance(job.data);
      } catch (e: any) {
        const isFinalAttempt = (job.retryCount ?? 0) >= (job.retryLimit ?? 0);
        if (isFinalAttempt) {
          await notifyJobFailure({ queue: "relance", job_id: job.id, error: e?.message ?? String(e) }).catch(() => {});
        }
        throw e;
      }
    }
  });
}
```

### 3. Register dans le boot worker

`apps/jobs/src/index.ts` :

```typescript
import { registerRelance } from "./handlers/relance.js";

// dans main() après les autres register :
await registerRelance(boss);
console.log("✓ handlers registered: intake, scoring, communication, heartbeat, relance");
```

## Patterns à respecter

### Pour les routes
- Toujours valider l'input avec `zValidator` (zod)
- Throw `Errors.notFound`, `Errors.conflict`, etc. → handler global gère le 4xx
- Pas de try/catch global qui swallow → laisse remonter, le middleware logger trace tout

### Pour les jobs
- Toujours `boss.createQueue(name)` avant `work()` (sinon la queue n'existe pas et `send()` retourne null)
- Toujours `try/catch + notifyJobFailure(isFinalAttempt) + throw e` → cohérent avec les handlers existants
- Toujours `includeMetadata: true` dans `boss.work()` options pour avoir `retryCount` / `retryLimit`
- Idempotence : si le job est rejoué (retry), `processX()` doit gérer le cas "déjà fait" (ex : check si `communications` existe déjà pour ce candidate avant d'insérer)

### Pour le dashboard

Si tu veux un bouton dans le UI :
1. Hook dans `apps/web/src/lib/mutations.ts` :
```typescript
export function useTriggerRelances() {
  return useMutation({
    mutationFn: () => api("/api/relances/trigger-bulk", { method: "POST" }),
    onSuccess: () => toast.success("Relances enqueuées"),
  });
}
```
2. Bouton dans la page concernée

## Coût

Chaque appel `runEmailPrompt` coûte ~0.001-0.005€ selon la longueur. Pour 100 relances/mois, c'est négligeable.

## Tests

Lance `pnpm test` après chaque ajout. Les tests d'intégration nécessitent un Postgres (locale ou CI).

## Ne pas oublier

- Migration Drizzle si tu ajoutes une colonne (`pnpm db:generate`)
- Doc dans [99-reference/api-endpoints.md](../99-reference/api-endpoints.md)
- Mention dans [05-operer/runbook-incidents.md](../05-operer/runbook-incidents.md) si tu introduis un nouveau type de fail
