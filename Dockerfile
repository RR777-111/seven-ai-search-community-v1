FROM node:22.23.1-alpine3.24 AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV COREPACK_NPM_REGISTRY=https://registry.npmjs.org
ENV COREPACK_DEFAULT_TO_LATEST=0
RUN NODE_USE_ENV_PROXY=1 corepack install -g pnpm@11.13.1 \
    && corepack enable \
    && test "$(corepack pnpm@11.13.1 --version)" = "11.13.1"
ENV COREPACK_ENABLE_NETWORK=0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS api-build
COPY apps/api apps/api
COPY packages/types packages/types
RUN --network=none pnpm --filter api build

FROM deps AS web-build
ARG API_BASE_URL=http://api:3001
ENV API_BASE_URL=$API_BASE_URL
COPY apps/web apps/web
COPY packages/types packages/types
RUN --network=none pnpm --filter web build

FROM api-build AS api
ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]

FROM web-build AS web
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.mjs"]
