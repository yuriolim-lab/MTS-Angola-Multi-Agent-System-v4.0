# syntax=docker/dockerfile:1

FROM node:alpine AS deps
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm install

FROM node:alpine AS builder
WORKDIR /srv
COPY --from=deps /srv/node_modules ./node_modules
COPY . .
RUN chmod 755 ./

FROM node:alpine AS production
WORKDIR /srv
COPY --from=builder /srv .
RUN mkdir -p data

CMD ["node", "server.js"]