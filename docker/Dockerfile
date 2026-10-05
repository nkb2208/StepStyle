# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/auth-types/package.json packages/auth-types/
COPY packages/auth-express/package.json packages/auth-express/
COPY services/auth-services/package.json services/auth-services/
COPY services/product-service/package.json services/product-service/
COPY services/order-service/package.json services/order-service/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run typecheck

FROM oven/bun:1-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /app ./
USER app

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["bun", "run", "services/auth-services/src/server.ts"]
