# Builda e roda a API (NestJS + Prisma) a partir da raiz do monorepo.
# Contexto de build esperado: raiz do repositorio (nao apps/api).
FROM node:22-slim AS build

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

RUN pnpm --filter @sinapse/shared build
RUN pnpm --filter @sinapse/api exec prisma generate
RUN pnpm --filter @sinapse/api build

FROM node:22-slim AS runtime

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app /app

WORKDIR /app/apps/api
EXPOSE 3333
# Aplica migracoes pendentes antes de subir. Idempotente: seguro rodar a cada deploy.
CMD ["sh", "-c", "pnpm db:deploy && node dist/main.js"]
