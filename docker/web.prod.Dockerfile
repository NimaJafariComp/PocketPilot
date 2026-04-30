# syntax=docker/dockerfile:1.4
FROM node:20-bookworm-slim AS deps

WORKDIR /workspace

COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/services/package.json packages/services/package.json
COPY packages/core ./packages/core
COPY packages/services ./packages/services

RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:20-bookworm-slim AS builder

WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules
COPY . .

RUN npm --workspace apps/web run build

FROM nginx:stable-alpine AS runner

COPY --from=builder /workspace/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
