#!/bin/bash

# Deploy script for Financieramente application
# This script is called by GitHub Actions during deployment

set -e

ENVIRONMENT=${1:-qa}
APP_DIR="/opt/financieramente"
LOG_FILE="/var/log/financieramente/deploy.log"

# Log everything
exec > >(tee -a $LOG_FILE)
exec 2>&1

echo "=========================================="
echo "Starting deployment for environment: $ENVIRONMENT"
echo "Date: $(date)"
echo "=========================================="

# Check if we're in the right directory
if [ ! -d "$APP_DIR" ]; then
	echo "❌ Application directory not found: $APP_DIR"
	exit 1
fi

cd $APP_DIR

# Backup current deployment (if exists)
if [ -d "backup" ]; then
	echo "Removing old backup..."
	rm -rf backup
fi

if [ -d "app" ]; then
	echo "Creating backup of current deployment..."
	mv app backup
fi

# Create new app directory
echo "Creating new app directory..."
mkdir -p app
cd app

# Clone the repository (GitHub Actions will have already done this)
# This is a placeholder - GitHub Actions will copy the code here
echo "Code will be copied by GitHub Actions..."

# Copy environment variables
echo "Setting up environment variables..."
if [ -f "../.env.template" ]; then
	cp ../.env.template .env
	echo "✅ Environment variables copied"
else
	echo "❌ Environment template not found"
	exit 1
fi

# Install dependencies
echo "Installing dependencies..."
if [ -f "package.json" ]; then
	npm ci --only=production
	echo "✅ Dependencies installed"
else
	echo "❌ package.json not found"
	exit 1
fi

# Generate Prisma client
echo "Generating Prisma client..."
if command -v npx >/dev/null 2>&1; then
	npx prisma generate
	echo "✅ Prisma client generated"
else
	echo "❌ npx not found"
	exit 1
fi

# Run database migrations
echo "Running database migrations..."
if command -v npx >/dev/null 2>&1; then
	npx prisma migrate deploy
	echo "✅ Database migrations completed"
else
	echo "❌ npx not found"
	exit 1
fi

# Build the application
echo "Building Next.js application..."
if [ -f "package.json" ]; then
	npm run build
	echo "✅ Application built successfully"
else
	echo "❌ package.json not found"
	exit 1
fi

# Stop existing containers
echo "Stopping existing containers..."
cd ..
if [ -f "docker-compose.yml" ]; then
	docker-compose down || true
	echo "✅ Existing containers stopped"
fi

# Copy new docker-compose file
echo "Setting up Docker Compose..."
if [ "$ENVIRONMENT" = "prod" ]; then
	if [ -f "docker-compose.prod.yml" ]; then
		cp docker-compose.prod.yml docker-compose.yml
	else
		echo "❌ Production docker-compose file not found"
		exit 1
	fi
else
	if [ -f "docker-compose.qa.yml" ]; then
		cp docker-compose.qa.yml docker-compose.yml
	else
		echo "❌ QA docker-compose file not found"
		exit 1
	fi
fi

# Build and start containers
echo "Building and starting containers..."
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Health check
echo "Performing health check..."
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
	echo "Health check attempt $ATTEMPT/$MAX_ATTEMPTS..."
	
	if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
		echo "✅ Health check passed"
		break
	elif [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
		echo "❌ Health check failed after $MAX_ATTEMPTS attempts"
		echo "Container logs:"
		docker-compose logs
		exit 1
	fi
	
	sleep 10
	ATTEMPT=$((ATTEMPT + 1))
done

# Verify database connection
echo "Verifying database connection..."
if command -v npx >/dev/null 2>&1; then
	cd app
	if npx prisma db pull > /dev/null 2>&1; then
		echo "✅ Database connection verified"
	else
		echo "❌ Database connection failed"
		exit 1
	fi
	cd ..
fi

# Clean up old images
echo "Cleaning up old Docker images..."
docker image prune -f

# Remove backup if deployment was successful
if [ -d "backup" ]; then
	echo "Removing backup..."
	rm -rf backup
fi

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "Environment: $ENVIRONMENT"
echo "Date: $(date)"
echo "=========================================="

# Log deployment info
echo "$(date): Successful deployment to $ENVIRONMENT" >> /var/log/financieramente/deployment-history.log
