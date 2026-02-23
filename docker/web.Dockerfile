FROM node:20-bookworm-slim

WORKDIR /workspace

COPY package*.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm install --prefix packages/services
RUN npm install --prefix apps/web

EXPOSE 5173

CMD ["npm", "--prefix", "apps/web", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
