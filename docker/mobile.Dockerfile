# syntax=docker/dockerfile:1.4
FROM node:20-bookworm-slim

WORKDIR /workspace

COPY package*.json ./
COPY apps/mobile/package.json apps/mobile/package.json
COPY apps/mobile/scripts ./apps/mobile/scripts
COPY packages/core/package.json packages/core/package.json
COPY packages/services/package.json packages/services/package.json
COPY packages/core ./packages/core
COPY packages/services ./packages/services

RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

EXPOSE 19000 19001 19002

CMD ["npm", "--prefix", "apps/mobile", "run", "start"]
