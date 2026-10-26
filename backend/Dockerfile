# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS development

WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci
COPY . .
USER node
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --omit=dev
COPY --chown=node:node . .
USER node
EXPOSE 3000
CMD ["npm", "start"]
