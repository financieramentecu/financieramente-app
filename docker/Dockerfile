# syntax=docker/dockerfile:1.6

# Multi-stage Dockerfile for Next.js application
# Optimized for production with Alpine Linux

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files (for better Docker layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with npm ci for faster, reliable, reproducible builds
RUN --mount=type=cache,target=/root/.npm \
	npm ci --prefer-offline --no-audit

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (this layer changes less often)
COPY package*.json ./
COPY next.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.* ./
COPY postcss.config.mjs ./

# Copy app source (more volatile, should be last before build)
COPY src ./src
COPY public ./public
COPY components.json ./

# Copy prisma directory for generating Prisma client
COPY prisma ./prisma/

# Verify prisma directory was copied correctly
RUN test -d /app/prisma || (echo "ERROR: prisma directory not found in builder stage" && exit 1)
RUN test -f /app/prisma/schema.prisma || (echo "ERROR: schema.prisma not found in builder stage" && exit 1)

# Clean any existing Next.js cache
RUN rm -rf .next || true

# Generate Prisma client
RUN npx prisma generate

# Build the application
# Build arguments for Next.js public variables (must be available at build time)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_TELEMETRY_DISABLED=1

ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Note: Type checking and ESLint are disabled in next.config.ts
# They are executed in CI/CD tests before deployment
# Using --no-cache flag to ensure fresh build
RUN npm run build

# Verify prisma directory still exists after build (it should)
RUN test -d /app/prisma || (echo "ERROR: prisma directory missing after build" && exit 1)
RUN test -f /app/prisma/schema.prisma || (echo "ERROR: schema.prisma missing after build" && exit 1)

# Stage 3: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache curl
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
# Note: standalone output includes server.js and node_modules, but NOT prisma directory
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy package.json for scripts
COPY --from=builder /app/package.json ./package.json

# Copy prisma directory with migrations (needed for migrate deploy)
# IMPORTANT: Copy from builder stage AFTER standalone to ensure it's not overwritten
# The builder stage has the prisma directory with schema.prisma and migrations/
# We verified it exists in the builder stage after the build
COPY --from=builder /app/prisma ./prisma

# Also copy from build context as backup (in case builder copy fails silently)
# This ensures prisma directory is available even if builder stage copy doesn't work
COPY prisma ./prisma

# Verify prisma directory was copied correctly (before switching user)
RUN test -d /app/prisma || (echo "ERROR: prisma directory not found after copy to runner stage" && ls -la /app/ && exit 1)
RUN test -f /app/prisma/schema.prisma || (echo "ERROR: schema.prisma not found in prisma directory" && ls -la /app/prisma/ && exit 1)
RUN ls -la /app/prisma/ || (echo "ERROR: Cannot list prisma directory" && exit 1)
RUN echo "✅ Prisma directory verified: $(ls -la /app/prisma/)"

# Install Prisma CLI for running migrations
RUN npm install -g prisma@^6.18.0

# Set correct permissions before switching to nextjs user
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
