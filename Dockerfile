FROM oven/bun:1.3.14-alpine AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN bun run build:node

FROM oven/bun:1.3.14-alpine AS production-dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_PATH=/data/nollywood-film-club.sqlite
ENV OBJECT_STORE_PATH=/data/objects
COPY package.json server.js ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/build ./build
RUN mkdir -p /data/objects
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
