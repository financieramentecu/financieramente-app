# Multi-stage Dockerfile for Next.js application
# Optimized for production with Alpine Linux

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files (for better Docker layer caching)
COPY package*.json ./
# COPY prisma ./prisma/  # Temporarily disabled - Prisma schema not configured yet

# Install dependencies with npm ci for faster, reliable, reproducible builds
RUN npm ci --prefer-offline --no-audit

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (this layer changes less often)
COPY package*.json ./
COPY next.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./

# Copy app source (more volatile, should be last before build)
COPY src ./src
COPY public ./public
COPY components.json ./

# Generate Prisma client
# RUN npx prisma generate  # Temporarily disabled - Prisma schema not configured yet

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production
# Skip type checking and linting during build (already done in CI tests)
ENV SKIP_ENV_VALIDATION true
ENV NEXT_SKIP_TYPE_CHECK true
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache curl
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# COPY --from=builder /app/prisma ./prisma  # Temporarily disabled - Prisma schema not configured yet

# Copy package.json for scripts
COPY --from=builder /app/package.json ./package.json

# Set correct permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
