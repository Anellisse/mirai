# Local Development Setup

## Prerequisites
- Node.js >= 20
- pnpm >= 9
- Docker Desktop (for PostgreSQL)

## First-time setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create environment files:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```
   Fill in real secrets in each `.env` file.

3. Start the database:
   ```bash
   docker compose -f docker/docker-compose.yml up -d postgres
   ```

4. Run migrations and seed:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. Start the apps:
   ```bash
   # In one terminal:
   pnpm --filter @mirai/api dev
   
   # In another terminal:
   pnpm --filter @mirai/web dev
   ```

6. Open http://localhost:3000

## Default credentials (after seed)
- Email: admin@neuropsia.cl
- Password: ChangeMeNow2024!
- **Change immediately after first login.**

---

## Despliegue en producción (Ubuntu/Debian + Docker)

### Prerrequisitos del servidor

- Docker Engine + Docker Compose plugin instalados
- Dominio apuntando al servidor (DNS propagado)
- Puertos 80 y 443 abiertos en el firewall
- `gpg` instalado (`sudo apt install gpg`)
- `certbot` instalado (`sudo apt install certbot`)

### Primera vez

**1. Clonar el repositorio:**
```bash
git clone <repo-url> /opt/mirai
cd /opt/mirai
```

**2. Crear archivo de secretos de producción:**
```bash
cp docker/.env.prod.example .env.prod
nano .env.prod   # completar todos los valores CAMBIAR_*
```

Generar secretos:
```bash
openssl rand -hex 32  # usar para JWT_SECRET, JWT_REFRESH_SECRET, RUT_HMAC_SECRET, ENCRYPTION_KEY
```

**3. Levantar el stack completo:**

> El TLS lo maneja Cloudflare Tunnel externamente. No se necesita certbot.

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

**4. Ejecutar migraciones (primera vez):**

> IMPORTANTE: usar `-w /app` — el schema de prisma está en `/app/prisma/`, no en el WORKDIR del contenedor.

```bash
docker exec -w /app mirai-api npx prisma migrate deploy
docker exec -w /app mirai-api node prisma/seed-bundle.js
```

**5. Verificar que todo funciona:**
```bash
docker compose -f docker/docker-compose.prod.yml ps
curl -s http://localhost/api/auth/me  # debe devolver 401 (sin token — pero la API responde)
curl -s http://localhost/            # debe devolver HTML del frontend
```

### Backups automáticos

Registrar el cron job en el servidor (como el usuario que corre Docker):
```bash
crontab -e
```

Agregar:
```
0 2 * * * /opt/mirai/docker/backup.sh >> /opt/mirai/backups/backup.log 2>&1
```

El backup se ejecuta diariamente a las 2 AM. Los archivos `.gpg` se guardan en `/opt/mirai/backups/` y se limpian automáticamente después de 30 días.

**Restaurar un backup:**
```bash
/opt/mirai/docker/restore.sh /opt/mirai/backups/mirai_2026-06-03_02-00.sql.gz.gpg
```

### Renovación automática de TLS

Agregar al cron (certbot renueva solo si faltan < 30 días):
```
0 3 * * * certbot renew --quiet && docker compose -f /opt/mirai/docker/docker-compose.prod.yml restart nginx
```

### Actualizar la aplicación

```bash
cd /opt/mirai
git pull
docker compose -f docker/docker-compose.prod.yml up -d --build
docker exec -w /app mirai-api npx prisma migrate deploy
```
