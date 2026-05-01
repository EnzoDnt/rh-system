# Déploiement — vue d'ensemble

Cette section documente comment déployer le projet en prod.

## Démarche

1. **Étapes communes à tous les hébergeurs** → [cloud-setup.md](cloud-setup.md)
   Crée le projet Supabase Cloud, récupère la clé Anthropic, applique les migrations BD, seed les prompts IA.

2. **Choix de l'hébergeur** → [matrice-de-choix.md](matrice-de-choix.md)
   Comparatif rapide Railway / Coolify / Vercel split / Docker pur.

3. **Recipe spécifique** selon ton choix :
   - [host-railway.md](host-railway.md) — non-tech, push-to-deploy, ~20€/mois
   - [host-coolify.md](host-coolify.md) — VPS perso avec Coolify, ~6€/mois
   - [host-generic.md](host-generic.md) — Vercel + Fly/Render, ou Docker pur

4. **Setup du projet Supabase** (détails) → [supabase-setup.md](supabase-setup.md)

## Pre-deploy checklist (manuelle, à chaque update)

1. CI verte sur la branche que tu vas merger.
2. Si la PR contient une nouvelle migration : `psql "$DATABASE_URL" -f packages/db/migrations/XXXX_*.sql` exécuté **avant** le merge (sinon les containers prod crashent).
3. `git status` propre.

## Post-deploy verification

```bash
curl https://<api-domain>/api/health     # → {"ok":true}
curl https://<api-domain>/config         # → {"resend_enabled":false} (ou true)
open https://<web-domain>                # → page login avec ton BRAND_NAME
```

Côté worker : pas d'URL HTTP, vérifier les logs de l'hébergeur. Tu dois voir :
```
✓ pg-boss started, schema=pgboss
✓ handlers registered: intake-internal, scoring, communication, heartbeat
```

## Rollback

Tous les hébergeurs supportés ont un mécanisme de rollback en 1 clic :

- **Railway** → service → Deployments → Restore une version précédente
- **Coolify** → service → Deployments → Redeploy un build précédent
- **Vercel** → Deployments → Promote to Production sur une version antérieure
- **Fly.io** → `fly releases list` puis `fly deploy --image-label vXXX`

Délai typique de rollback : ~30s.
