# Backup & restore

## Si tu utilises Supabase

✅ **Backup automatique inclus** sur le plan Pro (25€/mois) :
- Snapshot quotidien rétention 7 jours
- Point-in-time recovery jusqu'à 7 jours en arrière
- Géré par Supabase, rien à configurer

**Restore** : Supabase Dashboard → Database → Backups → Restore. Crée un nouveau projet Supabase ou écrase l'existant. Compte ~10 min.

## Si tu utilises un Postgres self-hosted

Tu dois configurer le backup toi-même.

### Option 1 — `pg_dump` cron quotidien

```bash
# /etc/cron.d/postgres-backup
0 3 * * * postgres pg_dump -U postgres -F c -b -v -f /backups/db-$(date +\%F).dump postgres
0 4 * * 0 postgres find /backups -name "db-*.dump" -mtime +30 -delete
```

Pousse les dumps vers S3 / Backblaze B2 / OVH Object Storage avec `rclone` ou `restic`.

### Option 2 — Replica streaming

Configure une réplique Postgres en standby sur une autre machine. Plus complexe, pas recommandé sauf besoin de RTO < 5 min.

## Backup des autres données

### Storage Supabase (CVs)

Si tu utilises un bucket Supabase pour héberger des CVs (option de Phase 4 dans le plan original, désactivée actuellement) : Storage Supabase n'a pas de backup automatique. Synchronise vers S3 :

```bash
supabase storage download cvs/ --local-path ./backup-cvs/
```

Ou via l'API Storage REST.

### Prompts (table `prompts` + `prompts_history`)

Inclus dans le backup Postgres global. Comme l'historique de versions de prompts est précieux, **vérifie après restore** que `prompts_history` contient bien tes versions custom.

## Restore — procédure complète

### Cas 1 : DB corrompue / supprimée par accident

1. Crée un nouveau projet Supabase (ou nouveau Postgres)
2. Restore le dernier dump : `pg_restore -U postgres -d postgres /backups/db-YYYY-MM-DD.dump`
3. Mets à jour `DATABASE_URL` dans Coolify/Railway/Vercel env vars
4. Redeploy api + worker
5. Vérifie : `pnpm test` côté api, ouvre `/postes` → tes données sont là

### Cas 2 : Supabase entier perdu (cas extrême)

1. Crée un nouveau projet Supabase
2. Re-applique les migrations (`pnpm --filter @rh/db migrate`)
3. Re-seed les prompts (`pnpm --filter @rh/db seed`) → tu perds tes versions custom de prompts
4. Si tu avais un backup pg_dump, restore les données métier
5. Re-configure Auth → URL configuration

## Test de restore (à faire 1× par trimestre)

Le backup qui n'a jamais été testé n'existe pas. Une fois par trimestre :

1. Crée un projet Supabase de test
2. Restore le dernier backup dedans
3. Pointe une instance dev vers ce projet
4. Vérifie : login OK, candidatures listées, scoring marche

## RPO / RTO réalistes

| Scénario | RPO (perte de données max) | RTO (temps de remise) |
|---|---|---|
| Supabase Pro + backup auto | 24h (snapshot quotidien) | 30 min |
| Postgres self-host + cron `pg_dump` quotidien | 24h | 1-2h |
| Sans backup | ∞ (tu repars de zéro) | impossible |

Pour la plupart des cabinets de recrutement, RPO 24h / RTO 1h est largement acceptable.
