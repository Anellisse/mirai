# Paso 10 — Seguridad, Backups y Despliegue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hardening de seguridad (Helmet + throttler), Docker Compose de producción con Nginx + TLS, y scripts de backup encriptado local.

**Architecture:** Tres cambios independientes que se integran al final: (1) middlewares de seguridad en la API NestJS; (2) stack de producción Docker con Nginx como único punto de entrada; (3) scripts Bash para backup/restauración encriptada de PostgreSQL. No se toca lógica de negocio.

**Tech Stack:** `@nestjs/throttler`, `@nestjs/helmet`, Docker multi-stage builds, Nginx 1.25+, `gpg` (AES-256 symmetric), `pg_dump`.

---

## File Map

| Archivo | Acción |
|---|---|
| `apps/api/package.json` | Modificar — agregar `@nestjs/throttler` y `@nestjs/helmet` |
| `apps/api/src/main.ts` | Modificar — helmet + CORS estricto |
| `apps/api/src/app.module.ts` | Modificar — ThrottlerModule + ThrottlerGuard global |
| `apps/api/src/modules/auth/auth.controller.ts` | Modificar — @Throttle override en login y verify-2fa |
| `apps/api/Dockerfile` | Nuevo — multi-stage build API |
| `apps/web/Dockerfile` | Nuevo — multi-stage build Web |
| `docker/docker-compose.prod.yml` | Nuevo — 4 servicios en red privada |
| `docker/nginx/nginx.conf` | Nuevo — TLS, headers de seguridad, proxy |
| `docker/.env.prod.example` | Nuevo — template de variables de producción |
| `docker/backup.sh` | Nuevo — pg_dump + gpg |
| `docker/restore.sh` | Nuevo — desencriptar + restaurar |
| `docs/SECURITY-TODO.md` | Nuevo — deuda de seguridad documentada |
| `docs/DEV-SETUP.md` | Modificar — sección de despliegue en producción |

---

## Task 1: Instalar dependencias de seguridad + Helmet

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Instalar @nestjs/throttler y @nestjs/helmet**

```bash
cd apps/api
pnpm add @nestjs/throttler @nestjs/helmet
```

- [ ] **Step 2: Verificar que aparecen en package.json**

```bash
grep -E "throttler|helmet" apps/api/package.json
```

Expected output:
```
"@nestjs/helmet": "^x.x.x",
"@nestjs/throttler": "^x.x.x",
```

- [ ] **Step 3: Actualizar main.ts con helmet y CORS estricto**

Reemplazar el contenido completo de `apps/api/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from '@nestjs/helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}
bootstrap();
```

- [ ] **Step 4: Verificar type-check sin errores**

```bash
pnpm --filter @mirai/api type-check
```

Expected: sin output (sin errores).

- [ ] **Step 5: Verificar que los 180 tests siguen pasando**

```bash
pnpm --filter @mirai/api test
```

Expected: `Test Suites: X passed`, `Tests: 180 passed` (o el número actual).

- [ ] **Step 6: Commit**

```bash
git add apps/api/package.json apps/api/src/main.ts
git commit -m "feat(api): add helmet security headers and strict CORS"
```

---

## Task 2: Configurar rate limiting (ThrottlerModule)

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Actualizar app.module.ts con ThrottlerModule y guard global**

Reemplazar el contenido completo de `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ReportsModule } from './modules/reports/reports.module';
import { InterviewModule } from './modules/interview/interview.module';
import { ObservationModule } from './modules/observation/observation.module';
import { ConclusionModule } from './modules/conclusion/conclusion.module';
import { DiagnosticCodesModule } from './modules/diagnostic-codes/diagnostic-codes.module';
import { DescriptorScalesModule } from './modules/descriptor-scales/descriptor-scales.module';
import { TestScoreSlotsModule } from './modules/test-score-slots/test-score-slots.module';
import { NormativeTablesModule } from './modules/normative-tables/normative-tables.module';
import { RulesEngineModule } from './modules/rules-engine/rules-engine.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { ScorePdfsModule } from './modules/score-pdfs/score-pdfs.module';
import { AnnexTablesModule } from './modules/annex-tables/annex-tables.module';
import { AiModule } from './modules/ai/ai.module';
import { ExportModule } from './modules/export/export.module';
import { FinalizeModule } from './modules/finalize/finalize.module';
import { RepositoryModule } from './modules/repository/repository.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    EncryptionModule,
    AuthModule,
    PatientsModule,
    ReportsModule,
    InterviewModule,
    ObservationModule,
    ConclusionModule,
    DiagnosticCodesModule,
    DescriptorScalesModule,
    TestScoreSlotsModule,
    NormativeTablesModule,
    RulesEngineModule,
    EvaluationModule,
    ScorePdfsModule,
    AnnexTablesModule,
    AiModule,
    ExportModule,
    FinalizeModule,
    RepositoryModule,
    AccessControlModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Agregar @Throttle override en auth.controller.ts para login y verify-2fa**

Reemplazar el contenido completo de `apps/api/src/modules/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { Role, UserPayload } from '@mirai/shared-types';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: UserPayload) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(AuthGuard('local'))
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(@Request() req: { user: any }) {
    return this.authService.login(req.user);
  }

  @Post('2fa/verify')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  verify2fa(@Body() dto: Verify2faDto) {
    return this.authService.verifyTwoFactor(dto.tempToken, dto.token);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  setup2fa(@CurrentUser() user: UserPayload) {
    return this.authService.setup2fa(user.sub);
  }

  @Post('2fa/confirm')
  @UseGuards(JwtAuthGuard)
  confirm2fa(@CurrentUser() user: UserPayload, @Body() dto: { token: string }) {
    return this.authService.confirm2fa(user.sub, dto.token);
  }
}
```

- [ ] **Step 3: Verificar type-check sin errores**

```bash
pnpm --filter @mirai/api type-check
```

Expected: sin output.

- [ ] **Step 4: Verificar que todos los tests siguen pasando**

```bash
pnpm --filter @mirai/api test
```

Expected: todos los tests pasan. Los tests de AuthService son unitarios (mockean Prisma y JwtService) y no usan ThrottlerGuard, por lo que no se ven afectados.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/modules/auth/auth.controller.ts
git commit -m "feat(api): add rate limiting — 100 req/min global, 10 req/min on auth endpoints"
```

---

## Task 3: Dockerfile para la API (multi-stage)

**Files:**
- Create: `apps/api/Dockerfile`

- [ ] **Step 1: Crear apps/api/Dockerfile**

```dockerfile
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/ packages/shared-types/
COPY apps/api/ apps/api/
COPY prisma/ prisma/

RUN pnpm install --frozen-lockfile --filter @mirai/api...
RUN pnpm --filter @mirai/api build

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/ packages/shared-types/
COPY apps/api/package.json apps/api/package.json
COPY prisma/ prisma/

RUN pnpm install --frozen-lockfile --filter @mirai/api... --prod

COPY --from=builder /app/apps/api/dist apps/api/dist

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main"]
```

- [ ] **Step 2: Verificar que el Dockerfile tiene sintaxis válida**

```bash
docker build --no-cache -f apps/api/Dockerfile . --target builder -t mirai-api-builder-test 2>&1 | tail -5
```

Expected: `Successfully built <id>` o similar sin errores fatales.

> Nota: si Docker no está disponible en el entorno de CI, saltar este step y marcarlo como pendiente de verificación en el servidor.

- [ ] **Step 3: Commit**

```bash
git add apps/api/Dockerfile
git commit -m "feat(api): add multi-stage production Dockerfile"
```

---

## Task 4: Dockerfile para la Web (multi-stage)

**Files:**
- Create: `apps/web/Dockerfile`

- [ ] **Step 1: Crear apps/web/Dockerfile**

```dockerfile
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/ packages/shared-types/
COPY apps/web/ apps/web/

RUN pnpm install --frozen-lockfile --filter @mirai/web...
RUN pnpm --filter @mirai/web build

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/ packages/shared-types/
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile --filter @mirai/web... --prod

COPY --from=builder /app/apps/web/.next apps/web/.next
COPY --from=builder /app/apps/web/next.config.ts apps/web/next.config.ts

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
```

- [ ] **Step 2: Verificar que el Dockerfile tiene sintaxis válida**

```bash
docker build --no-cache -f apps/web/Dockerfile . --target builder -t mirai-web-builder-test 2>&1 | tail -5
```

Expected: `Successfully built <id>` sin errores fatales.

> Nota: si Docker no está disponible en el entorno de CI, saltar este step.

- [ ] **Step 3: Commit**

```bash
git add apps/web/Dockerfile
git commit -m "feat(web): add multi-stage production Dockerfile"
```

---

## Task 5: Docker Compose de producción + Nginx + .env.prod.example

**Files:**
- Create: `docker/docker-compose.prod.yml`
- Create: `docker/nginx/nginx.conf`
- Create: `docker/.env.prod.example`

- [ ] **Step 1: Crear docker/docker-compose.prod.yml**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: mirai-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - mirai-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ..
      dockerfile: apps/api/Dockerfile
    container_name: mirai-api
    restart: unless-stopped
    env_file: ../.env.prod
    networks:
      - mirai-net
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: ..
      dockerfile: apps/web/Dockerfile
    container_name: mirai-web
    restart: unless-stopped
    env_file: ../.env.prod
    networks:
      - mirai-net
    depends_on:
      - api

  nginx:
    image: nginx:alpine
    container_name: mirai-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    networks:
      - mirai-net
    depends_on:
      - api
      - web

networks:
  mirai-net:
    driver: bridge

volumes:
  postgres_data:
```

- [ ] **Step 2: Crear docker/nginx/nginx.conf**

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  # Zona de rate limiting para endpoints de auth (capa Nginx, antes de NestJS)
  limit_req_zone $binary_remote_addr zone=api_auth:10m rate=10r/m;

  # Redirect HTTP → HTTPS
  server {
    listen 80;
    server_name _;

    # Certbot challenge (necesario para emisión/renovación de certificados)
    location /.well-known/acme-challenge/ {
      root /var/www/certbot;
    }

    location / {
      return 301 https://$host$request_uri;
    }
  }

  # HTTPS
  server {
    listen 443 ssl http2;
    server_name mirai.neuropsia.cl;  # CAMBIAR al dominio real del servidor

    ssl_certificate /etc/letsencrypt/live/mirai.neuropsia.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mirai.neuropsia.cl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;" always;
    add_header Referrer-Policy "no-referrer" always;

    # Endpoints de auth — rate limit estricto
    location /api/auth/login {
      limit_req zone=api_auth burst=5 nodelay;
      proxy_pass http://api:3001;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/auth/2fa/verify {
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
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

- [ ] **Step 3: Crear docker/.env.prod.example**

```bash
# =============================================================================
# Mirai — Variables de entorno de producción
# Copiar a: .env.prod (en la raíz del proyecto, nunca commitear)
# =============================================================================

# ── PostgreSQL ────────────────────────────────────────────────────────────────
# Contraseña fuerte (mínimo 24 chars, letras + números + símbolos)
POSTGRES_USER=mirai
POSTGRES_PASSWORD=CAMBIAR_CONTRASEÑA_FUERTE
POSTGRES_DB=mirai_prod

# URL interna (el contenedor api accede a postgres por nombre de servicio)
DATABASE_URL="postgresql://mirai:CAMBIAR_CONTRASEÑA_FUERTE@postgres:5432/mirai_prod"

# ── JWT ───────────────────────────────────────────────────────────────────────
# Generar con: openssl rand -hex 32
JWT_SECRET=CAMBIAR_64_CHARS_HEX
JWT_REFRESH_SECRET=CAMBIAR_64_CHARS_HEX_DIFERENTE
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Encriptación ──────────────────────────────────────────────────────────────
# Generar con: openssl rand -hex 32
RUT_HMAC_SECRET=CAMBIAR_64_CHARS_HEX
ENCRYPTION_KEY=CAMBIAR_64_CHARS_HEX

# ── App ───────────────────────────────────────────────────────────────────────
# URL pública del frontend (sin barra final)
WEB_URL=https://mirai.neuropsia.cl
PORT=3001

# ── Backups ───────────────────────────────────────────────────────────────────
# Passphrase para encriptación GPG de backups (mínimo 32 chars)
BACKUP_PASSPHRASE=CAMBIAR_PASSPHRASE_FUERTE

# ── IA ────────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 4: Verificar sintaxis del docker-compose.prod.yml**

```bash
docker compose -f docker/docker-compose.prod.yml config --quiet 2>&1
```

Expected: sin errores de sintaxis (puede advertir sobre variables no definidas — es esperado sin el archivo .env.prod).

- [ ] **Step 5: Commit**

```bash
git add docker/docker-compose.prod.yml docker/nginx/nginx.conf docker/.env.prod.example
git commit -m "feat(docker): production compose stack with Nginx, TLS config, and env template"
```

---

## Task 6: Scripts de backup y restauración

**Files:**
- Create: `docker/backup.sh`
- Create: `docker/restore.sh`

- [ ] **Step 1: Crear docker/backup.sh**

```bash
#!/bin/bash
set -euo pipefail

# Leer variables desde .env.prod en la raíz del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.prod"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] No se encontró $ENV_FILE" >&2
  exit 1
fi

# Cargar solo las variables de backup/postgres (evitar sobreescribir env del sistema)
POSTGRES_USER=$(grep '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')
BACKUP_PASSPHRASE=$(grep '^BACKUP_PASSPHRASE=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')

BACKUP_DIR="${BACKUP_DIR:-/opt/mirai/backups}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M)
FILENAME="mirai_${TIMESTAMP}.sql.gz.gpg"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup: $FILENAME"

# pg_dump → gzip → gpg (AES-256 simétrico)
docker exec mirai-postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip \
  | gpg --batch --yes \
        --passphrase "$BACKUP_PASSPHRASE" \
        --symmetric \
        --cipher-algo AES256 \
  > "$BACKUP_DIR/$FILENAME"

echo "[$(date)] OK: $BACKUP_DIR/$FILENAME" | tee -a "$BACKUP_DIR/backup.log"

# Eliminar backups con más de 30 días
find "$BACKUP_DIR" -name "*.sql.gz.gpg" -mtime +30 -delete

echo "[$(date)] Limpieza de backups > 30 días completada"
```

- [ ] **Step 2: Crear docker/restore.sh**

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.prod"

if [[ -z "${1:-}" ]]; then
  echo "Uso: ./restore.sh <archivo.sql.gz.gpg>"
  echo "Ejemplo: ./restore.sh /opt/mirai/backups/mirai_2026-06-03_02-00.sql.gz.gpg"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "[ERROR] Archivo no encontrado: $BACKUP_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] No se encontró $ENV_FILE" >&2
  exit 1
fi

POSTGRES_USER=$(grep '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')
POSTGRES_DB=$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')
BACKUP_PASSPHRASE=$(grep '^BACKUP_PASSPHRASE=' "$ENV_FILE" | cut -d= -f2 | tr -d '"')

echo "[$(date)] Restaurando desde: $BACKUP_FILE"
echo "[!] Esto reemplazará todos los datos actuales en $POSTGRES_DB. Ctrl+C para cancelar."
sleep 5

gpg --batch \
    --passphrase "$BACKUP_PASSPHRASE" \
    --decrypt "$BACKUP_FILE" \
  | gunzip \
  | docker exec -i mirai-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[$(date)] Restauración completada exitosamente."
```

- [ ] **Step 3: Hacer los scripts ejecutables**

```bash
chmod +x docker/backup.sh docker/restore.sh
```

- [ ] **Step 4: Verificar sintaxis de ambos scripts**

```bash
bash -n docker/backup.sh && echo "backup.sh: OK"
bash -n docker/restore.sh && echo "restore.sh: OK"
```

Expected:
```
backup.sh: OK
restore.sh: OK
```

- [ ] **Step 5: Commit**

```bash
git add docker/backup.sh docker/restore.sh
git commit -m "feat(docker): encrypted backup and restore scripts using gpg AES-256"
```

---

## Task 7: Documentación — SECURITY-TODO.md y DEV-SETUP.md

**Files:**
- Create: `docs/SECURITY-TODO.md`
- Modify: `docs/DEV-SETUP.md`

- [ ] **Step 1: Crear docs/SECURITY-TODO.md**

```markdown
# Security — Deuda Técnica Documentada

Ítems de seguridad fuera del alcance del MVP (Paso 10). Revisitar antes de escalar o exponer el sistema a más usuarios.

## Alta prioridad

- [ ] **Backup externo**: configurar `rclone` para copiar backups a Backblaze B2 o similar, encriptados en origen. El backup local actual no protege contra fallo de hardware del servidor.
- [ ] **Encriptación de campos clínicos adicionales**: los campos `diagnoses`, `medications`, `hospitalizations` e `hypotheses` en Prisma actualmente van en texto plano. `EncryptionService` (AES-256-GCM) ya existe — falta aplicarlo. Requiere migración de datos.
- [ ] **Log rotation**: configurar `logrotate` para los logs de Nginx y la aplicación. Sin esto, los logs crecen indefinidamente en disco.

## Media prioridad

- [ ] **Prueba automática de restauración**: script o cron job que restaura el último backup en una BD de staging y verifica integridad (`pg_restore --list`). Hoy la restauración es solo manual.
- [ ] **Monitoreo y alertas**: uptime check (UptimeRobot o similar), alerta si el servicio cae o si el disco supera el 80%. Sin esto, los fallos se detectan tarde.
- [ ] **Revisión de dependencias**: configurar `npm audit` en CI o Dependabot para detectar vulnerabilidades en paquetes npm.

## Baja prioridad

- [ ] **2FA para todos los roles**: actualmente es obligatorio solo para admins. Considerar para clínicos también.
- [ ] **Audit log de accesos fallidos**: los intentos fallidos de login se bloquean (AccountLockout) pero no quedan en `AuditLog`. Útil para detectar ataques.
- [ ] **Content-Security-Policy ajustada**: el CSP actual usa `'unsafe-inline'` para scripts y estilos (necesario para Next.js sin configuración adicional). Investigar nonces o hash-based CSP.
```

- [ ] **Step 2: Agregar sección de producción a docs/DEV-SETUP.md**

Agregar al final del archivo `docs/DEV-SETUP.md`:

```markdown

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

**3. Emitir certificado TLS (antes de levantar Nginx con SSL):**
```bash
# Levantar Nginx solo en HTTP para el challenge de Certbot
docker compose -f docker/docker-compose.prod.yml up -d nginx

certbot certonly --webroot -w /var/www/certbot -d mirai.neuropsia.cl

# Detener Nginx temporalmente
docker compose -f docker/docker-compose.prod.yml stop nginx
```

> Actualizar `server_name` y rutas de certificados en `docker/nginx/nginx.conf` con el dominio real.

**4. Levantar el stack completo:**
```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

**5. Ejecutar migraciones:**
```bash
docker exec mirai-api npx prisma migrate deploy
docker exec mirai-api npx prisma db seed
```

**6. Verificar que todo funciona:**
```bash
docker compose -f docker/docker-compose.prod.yml ps
curl -I https://mirai.neuropsia.cl/api/health  # debe devolver 404 (no hay endpoint /health, pero TLS funciona)
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
docker exec mirai-api npx prisma migrate deploy
```
```

- [ ] **Step 3: Verificar que los archivos son válidos (sin syntax errors de markdown)**

```bash
# Verificar que los archivos existen y tienen contenido
wc -l docs/SECURITY-TODO.md docs/DEV-SETUP.md
```

Expected: ambos archivos con más de 10 líneas.

- [ ] **Step 4: Commit**

```bash
git add docs/SECURITY-TODO.md docs/DEV-SETUP.md
git commit -m "docs: add SECURITY-TODO and production deployment guide"
```

---

## Task 8: Verificación final

**Files:** ninguno nuevo

- [ ] **Step 1: Ejecutar suite de tests completa**

```bash
pnpm --filter @mirai/api test
```

Expected: todos los tests pasan (≥180). Sin tests nuevos en este paso — los cambios son de config, no de lógica de negocio.

- [ ] **Step 2: Type-check API**

```bash
pnpm --filter @mirai/api type-check
```

Expected: sin errores.

- [ ] **Step 3: Type-check Web**

```bash
pnpm --filter @mirai/web type-check
```

Expected: sin errores.

- [ ] **Step 4: Verificar git status limpio**

```bash
git status
```

Expected: `nothing to commit, working tree clean`. Si hay cambios sin commitear (ej. `apps/api/src/modules/annex-tables/annex-tables.module.ts` que aparecía modificado en el git status inicial), revisar si son cambios intencionales y commitearlos o revertirlos.

- [ ] **Step 5: Verificar lista de commits del paso**

```bash
git log --oneline -8
```

Expected — los 6 commits de este paso, en orden:
```
<hash> docs: add SECURITY-TODO and production deployment guide
<hash> feat(docker): encrypted backup and restore scripts using gpg AES-256
<hash> feat(docker): production compose stack with Nginx, TLS config, and env template
<hash> feat(web): add multi-stage production Dockerfile
<hash> feat(api): add multi-stage production Dockerfile
<hash> feat(api): add rate limiting — 100 req/min global, 10 req/min on auth endpoints
<hash> feat(api): add helmet security headers and strict CORS
```

---

## Notas de despliegue real

Estos puntos aplican cuando se despliega en el servidor físico, no durante la implementación:

1. **Reemplazar dominio**: `mirai.neuropsia.cl` aparece en `nginx.conf` (2 veces) y en el `.env.prod`. Reemplazar con el dominio real antes de emitir el certificado.
2. **`.env.prod` nunca en git**: asegurarse de que `.env.prod` esté en `.gitignore`.
3. **Secretos de producción**: generarlos frescos con `openssl rand -hex 32`, nunca reutilizar los de desarrollo.
4. **Prisma en producción**: el comando es `npx prisma migrate deploy` (no `migrate dev`) — aplica las migraciones ya generadas sin crear nuevas.
