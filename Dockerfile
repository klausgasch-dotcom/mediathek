# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate || true
COPY package.json bun.lockb* package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f bun.lockb ]; then npm i -g bun && bun install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    else npm install; fi

COPY . .
RUN if [ -f bun.lockb ]; then bun run build; else npm run build; fi

# --- Runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy built output and minimal runtime
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
