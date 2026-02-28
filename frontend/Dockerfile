FROM oven/bun:1-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ASSET_PREFIX

COPY frontend/package*.json ./
RUN bun install --frozen-lockfile

COPY frontend/ .

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ASSET_PREFIX=$NEXT_PUBLIC_ASSET_PREFIX

RUN bun run build

FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.* ./

RUN bun install --frozen-lockfile

EXPOSE 3000

CMD ["bun", "run", "start"]
