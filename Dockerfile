# Multi-stage build for optimized production image
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .

# Production stage
FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

# Copy only source files (NOT node_modules from builder)
COPY --from=builder /app/server.js .
COPY --from=builder /app/helpers ./helpers
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT:-3001}', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE ${PORT:-3001}

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]