# One image for the API and the BullMQ workers (D28, D38).
# API:    node dist/index.mjs   (default)
# Worker: node --enable-source-maps dist/worker.mjs  (ECS task definition overrides the command)
FROM node:24-slim AS builder
RUN corepack enable
WORKDIR /app

COPY . .
RUN --mount=type=cache,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir /pnpm-store --filter "server..." --ignore-scripts \
 && pnpm exec varlock codegen --path ./apps/server/ \
 && pnpm exec varlock codegen --path ./packages/db/

ENV NODE_ENV=production
RUN cd apps/server && pnpm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app
USER node

EXPOSE 3000

WORKDIR /app/apps/server
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD ["node", "-e", "fetch('http://localhost:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
