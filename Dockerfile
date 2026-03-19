FROM node:22-bookworm AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json env.d.ts ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends golang-go git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts

# Mounted target repositories should be attached under /workspace.
WORKDIR /workspace

ENTRYPOINT ["node", "--import", "/app/scripts/register-md.mjs", "/app/dist/cli.js"]
CMD ["run"]
