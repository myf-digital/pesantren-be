# =========================
# Builder
# =========================
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY types ./types
COPY src ./src
RUN npm run build


# =========================
# Runner
# =========================
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN groupadd -r nodeapp && useradd -r -g nodeapp nodeapp

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
 && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY types ./types
COPY .sequelizerc ./

RUN mkdir -p /app/tmp /app/public \
 && chown -R nodeapp:nodeapp /app \
 && chmod -R 755 /app

USER nodeapp
EXPOSE 5000
CMD ["node", "dist/server.js"]
