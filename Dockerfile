FROM node:22-slim AS builder
WORKDIR /app

# Install dependencies (including dev for TypeScript compile)
COPY package.json ./
RUN npm install

# Build TypeScript to dist/
COPY tsconfig.json ./
COPY types ./types
COPY src ./src
RUN npm run build

# Runtime image
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Use the built node_modules from builder to ensure runtime libs are present
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY --from=builder /app/dist ./dist

# Ensure temp and static directories exist
RUN mkdir -p ./tmp ./public

# Default port (can be overridden by env)
EXPOSE 5000

CMD ["node", "dist/server.js"]

