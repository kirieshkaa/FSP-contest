FROM oven/bun:1-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_ASSET_PREFIX
ENV NEXT_PUBLIC_ASSET_PREFIX=$NEXT_PUBLIC_ASSET_PREFIX

COPY frontend/package*.json ./
RUN bun install --frozen-lockfile

COPY frontend/ .

RUN bun run build

FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

RUN bun install --frozen-lockfile --production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bunx curl -f http://localhost:3000 || exit 1

CMD ["bun", "run", "start"]
