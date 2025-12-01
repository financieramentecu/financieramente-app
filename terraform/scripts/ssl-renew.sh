#!/bin/bash

# SSL Certificate Renewal Script for Financieramente
# This script renews SSL certificates and restarts Nginx

set -e

ENVIRONMENT=${1:-qa}
LOG_FILE="/var/log/financieramente/ssl-renew.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=========================================="
log "SSL Certificate Renewal Started"
log "Environment: $ENVIRONMENT"
log "=========================================="

# Get domain based on environment
case "$ENVIRONMENT" in
    qa)
        DOMAIN="negocios.qa.financieramentecu.co"
        COMPOSE_FILE="docker/docker-compose.qa.yml"
        ;;
    prod)
        DOMAIN="negocios.financieramentecu.co"
        COMPOSE_FILE="docker/docker-compose.prod.yml"
        ;;
    *)
        log "Error: Unknown environment '$ENVIRONMENT'"
        exit 1
        ;;
esac

APP_DIR="/opt/financieramente"
SSL_DIR="$APP_DIR/docker/nginx/ssl"

log "Domain: $DOMAIN"
log "SSL Directory: $SSL_DIR"
log "Compose File: $COMPOSE_FILE"

# Create logs directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Stop Nginx temporarily for renewal (needs port 80)
log "Stopping Nginx temporarily..."
cd "$APP_DIR"
docker-compose -f "$COMPOSE_FILE" stop nginx || true

# Wait a moment for port to be released
sleep 2

# Attempt to renew certificates
log "Attempting to renew certificates..."
if certbot renew --quiet --standalone; then
    log "✅ Certificates renewed successfully"
    
    # Copy renewed certificates
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
    
    if [ -f "$CERT_PATH/fullchain.pem" ]; then
        cp "$CERT_PATH/fullchain.pem" "$SSL_DIR/cert.pem"
        cp "$CERT_PATH/privkey.pem" "$SSL_DIR/key.pem"
        chmod 644 "$SSL_DIR/cert.pem"
        chmod 600 "$SSL_DIR/key.pem"
        
        log "Certificates copied to $SSL_DIR"
        
        # Restart Nginx to load new certificates
        log "Restarting Nginx..."
        cd "$APP_DIR"
        docker-compose -f "$COMPOSE_FILE" up -d nginx
        
        log "Nginx restarted with new certificates"
        
        # Verify HTTPS is still working
        log "Verifying HTTPS..."
        sleep 5
        
        if curl -f -k https://$DOMAIN/health > /dev/null 2>&1; then
            log "✅ HTTPS verification successful"
        else
            log "⚠️  HTTPS verification failed after renewal"
        fi
    else
        log "Error: Certificate files not found at $CERT_PATH"
        exit 1
    fi
else
    log "Certificate renewal not needed or failed"
    # Restart Nginx even if renewal wasn't needed
    cd "$APP_DIR"
    docker-compose -f "$COMPOSE_FILE" up -d nginx
fi

log "=========================================="
log "SSL Certificate Renewal Completed"
log "=========================================="