# Runbook — incidents connus

Synthèse des bugs et gotchas rencontrés pendant le développement et la QA. Si un de ces symptômes apparaît, applique direct le fix correspondant.

## 🔴 Bloquants (fix critique)

### `Error: pg-boss send returned null id` dans les logs API

**Symptôme** : tout endpoint qui enqueue (`/rescore`, `/communications/:id/send`, webhook Formbricks) retourne **500**.

**Cause** : pg-boss v10 exige `boss.createQueue(name)` explicite avant `send()` ou `work()`. v9 le faisait implicitement, v10 non.

**Fix** : déjà appliqué dans le code (`apps/api/src/services/queue-client.ts` + chaque handler dans `apps/jobs/src/handlers/*.ts`). Si tu vois ce bug après une mise à jour de pg-boss, vérifie que les `createQueue` sont bien là.

### Page détail poste affiche "Une erreur est survenue"

**Symptôme** : `/postes/:id` montre l'ErrorBoundary avec le message *"A `<SelectItem />` must have a value prop that is not an empty string"*.

**Cause** : Radix Select interdit `<SelectItem value="">`. Si tu ajoutes un nouveau Select avec une option "Aucun", ne mets jamais `value=""`.

**Fix** : utilise un sentinel `"__none__"` mappé à `""` dans `onValueChange` :
```tsx
<Select value={x || "__none__"} onValueChange={(v) => setX(v === "__none__" ? "" : v)}>
  <SelectItem value="__none__">Aucun</SelectItem>
</Select>
```

### Webhook Formbricks retourne 401 alors que tout est configuré

**Symptôme** : tu as set `FORMBRICKS_WEBHOOK_SECRET` côté API mais les soumissions Formbricks reviennent en 401.

**Cause** : Formbricks self-hosted v3 ne supporte ni HMAC signing ni custom headers. Il fait juste un POST sur l'URL configurée.

**Fix** : modifie l'URL du webhook Formbricks pour inclure le token en query-param :
```
https://api.your-domain.example/webhooks/formbricks?token=<FORMBRICKS_WEBHOOK_SECRET>
```
Note : le code de `setup-survey` (route `POST /api/postes/:id/setup-survey`) bake automatiquement le token dans l'URL. Si tu modifies le webhook à la main dans Formbricks UI, n'oublie pas le `?token=`.

### Le worker semble vivant mais aucune notification d'échec n'arrive

**Symptôme** : tu sais qu'un job a fail (rescore d'une candidature avec un CV PDF cassé, par exemple), mais ton ntfy/Slack ne reçoit rien.

**Cause** : pg-boss v10 a supprimé l'événement global `failed.<queueName>`. Si tu utilisais `boss.on('failed.intake', ...)`, ça ne fire jamais.

**Fix** : déjà appliqué. Chaque handler `apps/jobs/src/handlers/*.ts` a un `try/catch` qui appelle `notifyJobFailure` SUR LA DERNIÈRE retry uniquement (sinon spam). Si tu ajoutes un nouveau handler, suis le pattern existant.

### Création de formulaire Formbricks → 500 "Invalid input"

**Symptôme** : "Créer le formulaire" sur un poste retourne 500. Logs API : `Formbricks createSurvey 400 ... questions.5: Invalid input`.

**Cause** : le LLM génère `choices: ["A", "B"]` mais Formbricks v3 attend `choices: [{id, label: {default}}]`.

**Fix** : déjà appliqué dans `apps/api/src/services/formbricks.ts` (mapper qui transforme strings → objets).

### Création de formulaire Formbricks → 401 unauthorized

**Symptôme** : 401 alors que `FORMBRICKS_API_KEY` est bien set.

**Cause** : ta clé API Formbricks est sur un environnement différent de `FORMBRICKS_ENVIRONMENT_ID`.

**Fix** : dans Formbricks UI → API Keys → recrée une clé sur le bon environnement avec scope **Manage**. Mets à jour `FORMBRICKS_API_KEY` côté API + redeploy.

## 🟡 Mineurs (à connaître)

### Save d'un poste / candidature ne montre pas de toast

**Symptôme** : tu cliques "Enregistrer", rien de visuel ne change, mais en BD c'est sauvegardé.

**Cause** : certaines mutations dans `apps/web/src/lib/mutations.ts` n'ont pas de `toast.success` dans le `onSuccess`.

**Fix** : ajoute `toast.success("Saved")` dans le hook concerné. Pattern dans `useUpdatePoste` etc.

### "Restaurer" un prompt ne met pas à jour la textarea localement

**Symptôme** : tu cliques "Restaurer v1" sur un prompt, le titre passe à "v3" mais la textarea garde le contenu de v2. Hard reload corrige.

**Cause** : `apps/web/src/components/prompts/PromptEditor.tsx` avait `useEffect(..., [prompt.id])` au lieu de `[prompt.id, prompt.version]`.

**Fix** : déjà appliqué.

### Les emails Resend partent en spam chez les candidats

**Symptôme** : tu envoies un email d'invitation, le candidat dit qu'il ne l'a jamais reçu. Tu vérifies, il est en spam.

**Cause** : DKIM/SPF/return-path pas configurés sur ton domaine.

**Fix** :
1. Resend → Domains → ton domaine → 3 records DNS à ajouter
2. Attends que les 3 soient `Verified`
3. Test avec https://www.mail-tester.com → score doit être ≥9/10

### Coolify deploy bloqué `In Progress` plusieurs heures

**Symptôme** : un déploiement reste en `In Progress`. Container `Exited` rouge.

**Cause** : pas de timeout configuré, parfois Coolify se plante silencieusement sur le build Docker.

**Fix** :
1. Coolify UI → Deployments → Cancel le job stuck
2. Settings → général → Restart le service
3. Si ça reprend pas, SSH → `docker ps | grep build` → `docker kill <id>`
4. Relance Deploy depuis Coolify

## 🟢 Pour info (pas un bug, mais surprenant)

### Les retries pg-boss multiplient les notifs

Sans le fix `notify-only-on-final-retry`, un job qui fail 3 fois (intake/scoring/communication) → 3 notifs. Le fix gate la notif sur `retryCount >= retryLimit`.

### Un payload webhook avec `data.surveyId` invalide → la candidature est "perdue"

Si Formbricks fire un webhook avec un `surveyId` qui ne match aucun poste, le worker intake throw "Aucun poste pour surveyId=…". La candidature **n'est pas insérée en BD**. Tu reçois la notif d'échec, mais tu n'as aucune trace du candidat.

**À considérer** : ajouter une table `webhook_failures` qui stocke les payloads invalides pour debug.

### Le score d'une candidature peut être recalculé en réutilisant le même prompt

Si tu cliques "Re-scorer", le worker re-run le prompt avec le même input. Vu que Claude est ~déterministe avec `temperature: 0`, tu obtiens souvent le même score. Pour vraiment changer le résultat, **modifie le prompt** dans `/prompts` avant de re-scorer.
