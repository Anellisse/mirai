# -- builder ──────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared-types/ packages/shared-types/
COPY apps/api/ apps/api/
COPY prisma/ prisma/

RUN pnpm install --frozen-lockfile --filter @mirai/api...
RUN pnpm --filter @mirai/api build

# -- runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

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
