FROM oven/bun:1.3.13 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    BETTER_AUTH_URL=http://localhost:3000 \
    BETTER_AUTH_SECRET=build-only-secret-that-is-at-least-32-characters \
    S3_ENDPOINT=http://localhost:9000 \
    S3_ACCESS_KEY_ID=build \
    S3_SECRET_ACCESS_KEY=build-secret
RUN node node_modules/next/dist/bin/next build --webpack

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /usr/local/bin/bun /usr/local/bin/bun
COPY --from=build /app/.next ./.next
COPY --from=build /app/app ./app
COPY --from=build /app/public ./public
COPY --from=build /app/server ./server
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json /app/bun.lock /app/next.config.ts /app/tsconfig.json /app/drizzle.config.ts ./
USER node
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]
