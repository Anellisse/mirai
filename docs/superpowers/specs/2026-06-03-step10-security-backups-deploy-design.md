# Paso 10 — Endurecimiento de seguridad, Backups y Despliegue

**Fecha:** 2026-06-03  
**Estado:** Aprobado  
**Alcance:** Opción A (mínimo viable seguro)

---

## Contexto

El sistema Mirai completa su roadmap MVP con este paso. Todo lo anterior (auth, RBAC, auditoría, encriptación AES-256-GCM del RUT) está implementado. Lo que falta es:

- Headers HTTP de seguridad y rate limiting en la API
- Stack de producción completo (Docker Compose + Nginx + TLS)
- Backups automáticos encriptados locales
- Documentación de deuda de seguridad fuera de alcance

**Entorno de destino:** Servidor Ubuntu/Debian físico (on-premise), accesible públicamente con dominio real. TLS via Let's Encrypt + Certbot.

---

## Sección 1: Endurecimiento de la API (NestJS)

### Helmet

Agregar `@nestjs/helmet` (wrapper de `helmet`) en `main.ts`:

```ts
app.use(helmet());
```

Esto activa automáticamente: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security` (HSTS, max-age 1 año), `X-XSS-Protection`, `Referrer-Policy: no-referrer`.

### Rate Limiting

Instalar `@nestjs/throttler`. Configurar en `app.module.ts`:

- **Global:** 100 request/minuto por IP
- **Auth override:** 10 request/minuto por IP en `AuthController` (endpoints `/api/auth/login`, `/api/auth/verify-2fa`)

Implementación: `ThrottlerModule.forRoot(...)` en `AppModule` + `APP_GUARD` global + `@Throttle({ default: { limit: 10, ttl: 60000 } })` en `AuthController`.

### CORS estricto

El `enableCors` actual ya usa `process.env.WEB_URL`. En producción se añade `allowedHeaders: ['Content-Type', 'Authorization']` para rechazar headers arbitrarios.

### Archivos afectados

- `apps/api/src/main.ts` — helmet + CORS estricto
- `apps/api/src/app.module.ts` — ThrottlerModule + ThrottlerGuard global
- `apps/api/src/modules/auth/auth.controller.ts` — @Throttle override
- `apps/api/package.json` — nuevas dependencias

---

## Sección 2: Docker Compose de producción + Nginx + TLS

### Estructura de archivos nuevos

```
docker/
  docker-compose.prod.yml
  nginx/
    nginx.conf
  .env.prod.example
```

### docker-compose.prod.yml

4 servicios en red privada interna `mirai-net`:

| Servicio | Imagen | Puertos expuestos al host | Notas |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | ninguno | Solo accesible desde `mirai-net` |
| `api` | Build desde `apps/api/Dockerfile` | ninguno | Variables desde `.env.prod` |
| `web` | Build desde `apps/web/Dockerfile` | ninguno | Variables desde `.env.prod` |
| `nginx` | `nginx:alpine` | 80, 443 | Único punto de entrada |

Postgres no expone su puerto al host. Solo Nginx es accesible externamente.

### Dockerfiles

**`apps/api/Dockerfile`** — multi-stage:
1. Stage `builder`: `node:20-alpine`, instala deps, compila con `nest build`
2. Stage `runner`: copia `dist/` y `node_modules`, corre `node dist/main`

**`apps/web/Dockerfile`** — multi-stage:
1. Stage `builder`: instala deps, corre `next build`
2. Stage `runner`: copia `.next/standalone`, corre `node server.js`

### nginx.conf

```nginx
# limit_req_zone debe ir en el bloque http (fuera de server)
http {
  limit_req_zone $binary_remote_addr zone=api_auth:10m rate=10r/m;

  # Redirect HTTP → HTTPS
  server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
  }

  # HTTPS
  server {
    listen 443 ssl http2;
    server_name mirai.neuropsia.cl;  # placeholder — admin configura

    ssl_certificate /etc/letsencrypt/live/mirai.neuropsia.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mirai.neuropsia.cl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
    add_header Referrer-Policy "no-referrer" always;

  location /api/auth/ {
    limit_req zone=api_auth burst=5 nodelay;
    proxy_pass http://api:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /api/ {
    proxy_pass http://api:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

    location / {
      proxy_pass http://web:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }
}
```

### .env.prod.example

Template de variables de producción. Documenta valores requeridos con instrucciones de generación:

```env
# Base de datos
DATABASE_URL="postgresql://mirai:<PASSWORD>@postgres:5432/mirai_prod"

# JWT — generar con: openssl rand -hex 32
JWT_SECRET="<64-char-hex>"
JWT_REFRESH_SECRET="<64-char-hex>"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Encriptación — generar con: openssl rand -hex 32
RUT_HMAC_SECRET="<64-char-hex>"
ENCRYPTION_KEY="<64-char-hex>"

# App
WEB_URL="https://mirai.neuropsia.cl"
PORT=3001

# Postgres (para docker-compose.prod.yml)
POSTGRES_USER=mirai
POSTGRES_PASSWORD="<strong-password>"
POSTGRES_DB=mirai_prod

# Backups
BACKUP_PASSPHRASE="<strong-passphrase>"
```

### TLS — Emisión inicial (documentada en DEV-SETUP.md)

```bash
# Emitir certificado (en el host, antes de levantar nginx con TLS)
certbot certonly --standalone -d mirai.neuropsia.cl

# Renovación automática (agregar al cron del host)
0 3 * * * certbot renew --quiet && docker compose -f docker-compose.prod.yml restart nginx
```

---

## Sección 3: Backups locales encriptados

### docker/backup.sh

```bash
#!/bin/bash
set -euo pipefail

source "$(dirname "$0")/../.env.prod"

BACKUP_DIR="/opt/mirai/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
FILENAME="mirai_${TIMESTAMP}.sql.gz.gpg"

mkdir -p "$BACKUP_DIR"

# Dump + compress + encrypt
docker exec mirai-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip \
  | gpg --batch --yes --passphrase "$BACKUP_PASSPHRASE" --symmetric --cipher-algo AES256 \
  > "$BACKUP_DIR/$FILENAME"

echo "[$(date)] OK: $FILENAME" >> "$BACKUP_DIR/backup.log"

# Limpiar backups > 30 días
find "$BACKUP_DIR" -name "*.gpg" -mtime +30 -delete
```

### docker/restore.sh

```bash
#!/bin/bash
set -euo pipefail

source "$(dirname "$0")/../.env.prod"

BACKUP_FILE="$1"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Uso: ./restore.sh <archivo.sql.gz.gpg>"
  exit 1
fi

gpg --batch --passphrase "$BACKUP_PASSPHRASE" --decrypt "$BACKUP_FILE" \
  | gunzip \
  | docker exec -i mirai-postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo "Restauración completada desde $BACKUP_FILE"
```

### Cron (documentado en DEV-SETUP.md)

```
0 2 * * * /opt/mirai/docker/backup.sh >> /opt/mirai/backups/backup.log 2>&1
```

---

## docs/SECURITY-TODO.md

Archivo que documenta explícitamente lo fuera de alcance del MVP:

- Backup externo (rclone a Backblaze B2 o similar)
- Encriptación de campos adicionales: `diagnoses`, `medications`, `hospitalizations`, `hypotheses` en Prisma (infraestructura lista, requiere migración)
- Prueba automatizada de restauración de backup
- Log rotation con `logrotate`
- Monitoreo/alertas (Grafana, uptime checks)
- Revisión de dependencias con Dependabot o `npm audit` en CI

---

## Archivos nuevos y modificados

| Archivo | Acción |
|---|---|
| `apps/api/src/main.ts` | Modificar — helmet + CORS estricto |
| `apps/api/src/app.module.ts` | Modificar — ThrottlerModule |
| `apps/api/src/modules/auth/auth.controller.ts` | Modificar — @Throttle override |
| `apps/api/package.json` | Modificar — nuevas deps |
| `apps/api/Dockerfile` | Nuevo |
| `apps/web/Dockerfile` | Nuevo |
| `docker/docker-compose.prod.yml` | Nuevo |
| `docker/nginx/nginx.conf` | Nuevo |
| `docker/.env.prod.example` | Nuevo |
| `docker/backup.sh` | Nuevo |
| `docker/restore.sh` | Nuevo |
| `docs/SECURITY-TODO.md` | Nuevo |
| `docs/DEV-SETUP.md` | Modificar — instrucciones de deploy, TLS, cron |

---

## Tests

El Paso 10 no agrega lógica de negocio nueva, por lo que no agrega tests unitarios. Lo verificable:

- `npm run type-check` en `apps/api` — sin errores TypeScript
- `npm run test` en `apps/api` — los 180 tests existentes siguen pasando
- Smoke test manual: `docker compose -f docker-compose.prod.yml up` en local con certs autofirmados

---

## Fuera de alcance explícito

- Encriptación de campos adicionales en Prisma (ver SECURITY-TODO.md)
- Backup externo
- CI/CD pipeline (GitHub Actions, etc.)
- Monitoreo/observabilidad
