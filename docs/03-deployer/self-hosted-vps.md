# Déployer sur ton propre VPS (Docker)

Tu as un VPS quelque part (OVH, Hetzner, Scaleway, DigitalOcean, etc.). Tu veux y faire tourner le système avec Docker, sans Coolify ni autre PaaS.

## Prérequis sur le VPS

- Linux (Ubuntu 22.04+ recommandé)
- Docker + Docker Compose installés
- Un domaine pointé sur l'IP du VPS (4 sous-domaines : `rh.`, `api.`, `fiches.`, `formbricks.`)
- Au moins 2 vCPU, 4 GB RAM, 40 GB SSD

## Étape 1 — Cloner le repo

```bash
ssh user@votre-vps
git clone https://github.com/<your-org>/<repo>.git
cd <repo>
cp .env.example .env
nano .env  # remplis avec tes valeurs
```

## Étape 2 — Reverse proxy + HTTPS via Caddy

Le `docker-compose.yaml` ne gère **pas** le reverse proxy (c'était fait par Coolify+Traefik dans la version originale). Tu peux installer Caddy directement sur l'host :

```bash
# Caddy install (Debian/Ubuntu)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

`/etc/caddy/Caddyfile` :
```caddy
rh.your-domain.example {
    reverse_proxy localhost:5173
}

api.your-domain.example {
    reverse_proxy localhost:3000
}

fiches.your-domain.example {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy gère automatiquement Let's Encrypt.

## Étape 3 — Lancer les services

```bash
docker compose up -d
docker compose logs -f  # vérifie qu'aucun service crash
```

## Étape 4 — Migrations + seed

Voir [supabase-setup.md](supabase-setup.md). Si tu utilises Supabase Cloud, applique les migrations via SQL Editor. Si tu utilises un Postgres local sur le VPS, change `DATABASE_URL` dans `.env` et lance :

```bash
docker compose exec api pnpm --filter @rh/db migrate
docker compose exec api pnpm --filter @rh/db seed
```

## Étape 5 — Formbricks

Soit cloud (https://app.formbricks.com), soit self-hosted dans le même docker-compose. Pour le self-host, ajoute un service Formbricks dans ton `docker-compose.yaml` (voir https://github.com/formbricks/formbricks#self-hosting).

## Maintenance

```bash
# Mise à jour
git pull
docker compose pull
docker compose up -d --build

# Backup BD (si Postgres local)
docker compose exec postgres pg_dump -U postgres > backup-$(date +%F).sql

# Logs
docker compose logs -f --tail=100 api
docker compose logs -f --tail=100 worker
```

## Coût

- VPS 2 vCPU / 4 GB / 40 GB : ~6-15€/mois selon hébergeur
- Domaine : ~10€/an
- Anthropic : à l'usage
