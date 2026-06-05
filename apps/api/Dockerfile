FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY prisma/ prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mirai/shared-types build
RUN pnpm --filter @mirai/clinical-constants build
RUN pnpm --filter @mirai/api build
RUN pnpm exec esbuild prisma/seed/index.ts --bundle --platform=node --outfile=prisma/seed-bundle.js --external:@prisma/client

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/ packages/shared-types/
COPY apps/api/package.json apps/api/package.json
COPY prisma/ prisma/

RUN pnpm install --frozen-lockfile --filter @mirai/api... --prod

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=builder /app/prisma/seed-bundle.js prisma/seed-bundle.js

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/apps/api/src/main"]
