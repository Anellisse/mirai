FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── builder ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
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
COPY --from=builder /app/apps/web/next.config.mjs apps/web/next.config.mjs

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
