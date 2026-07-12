# Build container
FROM node:lts-alpine AS builder

# Use Workdir because things like tailwind will scan the entire current dir and can cause issues if it scans root
WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

ENV PNPM_HOME="~/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm i -g pnpm

RUN pnpm i --frozen-lockfile

COPY . ./
RUN pnpm run build


# Deployment container
FROM node:lts-alpine AS deployment
WORKDIR /app
COPY --from=builder /app/.output ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/server/db ./server/db
RUN npm i -g pnpm

# Install only tools needed for migration/seed
RUN pnpm i --frozen-lockfile --dev --ignore-scripts
RUN pnpm rebuild esbuild better-sqlite3
COPY --from=builder /app/entrypoint.sh /entrypoint

# Ensure we can actually run the entrypoint script
RUN chmod +x /entrypoint
EXPOSE 3000
ENTRYPOINT ["/entrypoint"]
CMD ["node", "./server/index.mjs"]
