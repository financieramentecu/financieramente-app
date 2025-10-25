#!/bin/bash

# Deploy script for Financieramente application
# This script is called by GitHub Actions during deployment

set -e

ENVIRONMENT=${1:-qa}
APP_DIR="/opt/financieramente"
LOG_FILE="/var/log/financieramente/deploy.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to handle errors
handle_error() {
    log "❌ Error occurred at line $1"
    log "❌ Deployment failed for environment: $ENVIRONMENT"
    exit 1
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Log everything
exec > >(tee -a $LOG_FILE)
exec 2>&1

log "=========================================="
log "Starting deployment for environment: $ENVIRONMENT"
log "Date: $(date)"
log "=========================================="

# Check if we're in the right directory
if [ ! -d "$APP_DIR" ]; then
	log "❌ Application directory not found: $APP_DIR"
	exit 1
fi

cd $APP_DIR

# Backup current deployment (if exists)
if [ -d "backup" ]; then
	log "Removing old backup..."
	rm -rf backup
fi

if [ -d "app" ]; then
	log "Creating backup of current deployment..."
	mv app backup
fi

# Create new app directory
log "Creating new app directory..."
mkdir -p app
cd app

# Clone the repository (GitHub Actions will have already done this)
# This is a placeholder - GitHub Actions will copy the code here
log "Code will be copied by GitHub Actions..."

# Copy environment variables
log "Setting up environment variables..."
if [ -f "../.env.template" ]; then
	cp ../.env.template .env
	log "✅ Environment variables copied"
else
	log "❌ Environment template not found"
	exit 1
fi

# Install dependencies
log "Installing dependencies..."
if [ -f "package.json" ]; then
	npm ci --only=production
	log "✅ Dependencies installed"
else
	log "❌ package.json not found"
	exit 1
fi

# Generate Prisma client
log "Prisma client generation temporarily disabled - schema not configured yet"
# if command -v npx >/dev/null 2>&1; then
#	npx prisma generate
#	log "✅ Prisma client generated"
# else
#	log "❌ npx not found"
#	exit 1
# fi

# Run database migrations
log "Database migrations temporarily disabled - Prisma schema not configured yet"
# if command -v npx >/dev/null 2>&1; then
#	npx prisma migrate deploy
#	log "✅ Database migrations completed"
# else
#	log "❌ npx not found"
#	exit 1
# fi

# Build the application
log "Building Next.js application..."
if [ -f "package.json" ]; then
	npm run build
	log "✅ Application built successfully"
else
	log "❌ package.json not found"
	exit 1
fi

# Stop existing containers
log "Stopping existing containers..."
cd ..
if [ -f "docker-compose.yml" ]; then
	docker-compose down --timeout 30 || true
	log "✅ Existing containers stopped"
fi

# Copy new docker-compose file
log "Setting up Docker Compose..."
if [ "$ENVIRONMENT" = "prod" ]; then
	if [ -f "docker-compose.prod.yml" ]; then
		cp docker-compose.prod.yml docker-compose.yml
	else
		log "❌ Production docker-compose file not found"
		exit 1
	fi
else
	if [ -f "docker-compose.qa.yml" ]; then
		cp docker-compose.qa.yml docker-compose.yml
	else
		log "❌ QA docker-compose file not found"
		exit 1
	fi
fi

# Build and start containers
log "Building and starting containers..."
docker-compose build --no-cache --parallel
docker-compose up -d

# Wait for services to be ready
log "Waiting for services to be ready..."
sleep 30

# Health check
log "Performing health check..."
MAX_ATTEMPTS=15
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
	log "Health check attempt $ATTEMPT/$MAX_ATTEMPTS..."
	
	if curl -f --connect-timeout 10 --max-time 30 http://localhost:3000/api/health > /dev/null 2>&1; then
		log "✅ Health check passed"
		break
	elif [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
		log "❌ Health check failed after $MAX_ATTEMPTS attempts"
		log "Container logs:"
		docker-compose logs --tail=50
		exit 1
	fi
	
	sleep 10
	ATTEMPT=$((ATTEMPT + 1))
done

# Verify database connection
log "Verifying database connection..."
log "Database connection verification temporarily disabled - Prisma schema not configured yet"
# if command -v npx >/dev/null 2>&1; then
#	cd app
#	if npx prisma db pull > /dev/null 2>&1; then
#		log "✅ Database connection verified"
#	else
#		log "❌ Database connection failed"
#		exit 1
#	fi
#	cd ..
# fi

# Clean up old images
log "Cleaning up old Docker images..."
docker image prune -f

# Remove backup if deployment was successful
if [ -d "backup" ]; then
	log "Removing backup..."
	rm -rf backup
fi

log "=========================================="
log "✅ Deployment completed successfully!"
log "Environment: $ENVIRONMENT"
log "Date: $(date)"
log "=========================================="

# Log deployment info
echo "$(date): Successful deployment to $ENVIRONMENT" >> /var/log/financieramente/deployment-history.log
