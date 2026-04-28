# Monitoring & alertes

Trois canaux pour savoir ce qui se passe en prod :

## 1. Heartbeat horaire

Le worker pg-boss a un job cron `heartbeat` qui fire **toutes les heures pile** (`0 * * * *` Europe/Paris) et envoie une notification via `notifyHeartbeat()`. Si tu ne le reçois pas → le worker est mort.

Code : [`apps/jobs/src/handlers/heartbeat.ts`](../../apps/jobs/src/handlers/heartbeat.ts).

## 2. Alertes échec de jobs

Si un job intake/scoring/communication échoue après ses retries, `notifyJobFailure()` envoie un message d'erreur avec :
- `queue` (intake/scoring/communication)
- `job_id`
- `error` (le message d'exception)

**Important** : la notif fire seulement sur la **dernière retry** (pour éviter le spam). Si tu observes 3 notifs pour 1 job, c'est qu'un fix de PR antérieure a régressé — voir [runbook-incidents.md](runbook-incidents.md).

## 3. Coût Anthropic en temps réel

Chaque appel Claude (scoring, email, fiche, formulaire, critères, guardrails) écrit une ligne dans la table `ai_calls` avec :
- `prompt_type`, `model`, `input_tokens`, `output_tokens`, `cache_*_tokens`, `cost_eur`

Le dashboard `/analytics` affiche 2 KPIs :
- **Coût IA — aujourd'hui** : somme des `cost_eur` depuis minuit
- **Coût IA — ce mois** : somme depuis le 1ᵉʳ du mois

Pour voir le détail (par prompt_type, par jour) :
```sql
SELECT prompt_type, model, COUNT(*), SUM(cost_eur)::numeric(10,4) as total_eur
FROM ai_calls
WHERE created_at >= date_trunc('day', now()) - interval '7 days'
GROUP BY prompt_type, model
ORDER BY total_eur DESC;
```

## Configuration des canaux

### ntfy (par défaut, gratuit)

```env
NTFY_TOPIC=mon-topic-secret-x9k3m
```

L'app `notifier.ts` POST sur `https://ntfy.sh/${NTFY_TOPIC}`. Installe l'app iOS/Android ntfy + abonne-toi au topic. **Choisis un nom unguessable** (genre 8+ chars random) sinon n'importe qui peut lire tes alertes.

### Slack (optionnel, override ntfy)

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../.....
```

Si défini, prend la priorité sur ntfy. Crée le webhook dans Slack → Apps → Incoming Webhooks.

## Vérifier que tout marche

```bash
# 1. Heartbeat : attends l'heure pile suivante. Si pas de notif, worker mort.

# 2. Alerte échec : trigger un fail intentionnel
curl -X POST https://api.your-domain.example/webhooks/formbricks?token=<secret> \
  -H 'Content-Type: application/json' \
  -d '{"data":{"surveyId":"INVALID-TEST"}}'
# Attends ~1 min : devrait recevoir 1 notif "Aucun poste pour surveyId=INVALID-TEST"

# 3. Coût IA : ouvre /analytics. Si "Coût IA — aujourd'hui" > 0, ça marche.
```

## Limites connues

- **Pas de health-check sur l'API** au-delà du `GET /api/health` — si tu veux un uptime monitoring externe (UptimeRobot, BetterStack), pointe-le sur `/api/health` toutes les 5 min
- **Pas d'agrégation latence** — pas de Prometheus/Grafana intégré. Si besoin, ajoute Sentry ou Axiom
- **Pas d'alerte sur backlog pg-boss** — si la queue accumule 100 jobs, personne ne le sait. À ajouter : un cron qui SELECT count(*) FROM pgboss.job WHERE state='created' et alerte si > seuil

Voir [runbook-incidents.md](runbook-incidents.md) pour les bugs connus.
