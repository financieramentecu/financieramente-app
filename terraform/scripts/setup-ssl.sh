#!/bin/bash

# SSL Setup Script for Financieramente
# This script installs Certbot and configures SSL certificates for the application

set -e

ENVIRONMENT=${1:-qa}
DOMAIN=${2:-}

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 [qa|prod] <domain.com>"
    echo "Example: $0 qa negocios.qa.financieramentecu.co"
    exit 1
fi

LETSENCRYPT_EMAIL="${3:-john.agudelo@financieramentecu.com}"

echo "=========================================="
echo "SSL Setup for Financieramente"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Domain: $DOMAIN"
echo "Email: $LETSENCRYPT_EMAIL"
echo ""

# Define paths based on current structure
APP_DIR="/opt/financieramente"
SSL_DIR="$APP_DIR/docker/nginx/ssl"

# Determine docker-compose file based on environment
if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_FILE="docker/docker-compose.prod.yml"
else
    COMPOSE_FILE="docker/docker-compose.qa.yml"
fi

# Create SSL directory
echo "Creating SSL directory..."
mkdir -p "$SSL_DIR"
chmod 755 "$SSL_DIR"

# Install Certbot if not already installed
if ! command -v certbot >/dev/null 2>&1; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot
else
    echo "✅ Certbot already installed: $(certbot --version)"
fi

# Stop Nginx temporarily to free port 80
echo "Stopping Nginx temporarily..."
cd "$APP_DIR"
docker-compose -f "$COMPOSE_FILE" stop nginx || true

# Wait a moment for port to be released
sleep 2

# Obtain SSL certificate
echo "Obtaining SSL certificate for $DOMAIN..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$LETSENCRYPT_EMAIL" \
    -d "$DOMAIN" \
    --preferred-challenges http

# Copy certificates to application directory
echo "Copying certificates..."
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
cp "$CERT_PATH/fullchain.pem" "$SSL_DIR/cert.pem"
cp "$CERT_PATH/privkey.pem" "$SSL_DIR/key.pem"

# Set proper permissions
chmod 644 "$SSL_DIR/cert.pem"
chmod 600 "$SSL_DIR/key.pem"

echo "✅ Certificates installed successfully!"

# Restart services
echo "Restarting services..."
cd "$APP_DIR"
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Verify HTTPS is working
echo "Verifying HTTPS configuration..."
if curl -f -k https://$DOMAIN/health > /dev/null 2>&1; then
    echo "✅ HTTPS is working correctly!"
else
    echo "⚠️  HTTPS verification failed. Please check the configuration."
    echo "Certificate location: $SSL_DIR"
fi

echo ""
echo "=========================================="
echo "SSL Setup Completed!"
echo "=========================================="
echo "Domain: https://$DOMAIN"
echo "Certificates: $SSL_DIR"
echo ""
echo "Next steps:"
echo "1. Configure automatic renewal with cron job"
echo "2. Test your application at https://$DOMAIN"
echo "3. Monitor certificate expiration: certbot certificates"
echo ""