#!/bin/bash

# Diagnostic script for Financieramente deployment issues
# This script helps troubleshoot deployment problems

set -e

ENVIRONMENT=${1:-qa}
APP_DIR="/opt/financieramente"
LOG_FILE="/var/log/financieramente/diagnostic.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "=========================================="
log "Starting diagnostic for environment: $ENVIRONMENT"
log "Date: $(date)"
log "=========================================="

# Check system resources
log "=== System Resources ==="
log "Memory usage:"
free -h | tee -a $LOG_FILE

log "Disk usage:"
df -h | tee -a $LOG_FILE

log "CPU load:"
uptime | tee -a $LOG_FILE

# Check Docker status
log "=== Docker Status ==="
if systemctl is-active --quiet docker; then
    log "✅ Docker is running"
else
    log "❌ Docker is not running"
    systemctl status docker | tee -a $LOG_FILE
fi

log "Docker version:"
docker --version | tee -a $LOG_FILE

log "Docker Compose version:"
docker-compose --version | tee -a $LOG_FILE

# Check application directory
log "=== Application Directory ==="
if [ -d "$APP_DIR" ]; then
    log "✅ Application directory exists: $APP_DIR"
    log "Directory contents:"
    ls -la $APP_DIR | tee -a $LOG_FILE
else
    log "❌ Application directory not found: $APP_DIR"
fi

# Check environment file
log "=== Environment Configuration ==="
if [ -f "$APP_DIR/.env" ]; then
    log "✅ Environment file exists"
    log "Environment variables (without sensitive data):"
    grep -v -E "(PASSWORD|SECRET|KEY)" $APP_DIR/.env | tee -a $LOG_FILE
else
    log "❌ Environment file not found"
fi

# Check Docker containers
log "=== Docker Containers ==="
cd $APP_DIR
if [ -f "docker-compose.yml" ]; then
    log "✅ Docker Compose file exists"
    log "Container status:"
    docker-compose ps | tee -a $LOG_FILE
    
    log "Container logs (last 20 lines each):"
    docker-compose logs --tail=20 | tee -a $LOG_FILE
else
    log "❌ Docker Compose file not found"
fi

# Check network connectivity
log "=== Network Connectivity ==="
log "Testing localhost connectivity:"
if curl -f --connect-timeout 5 http://localhost:3000/api/health > /dev/null 2>&1; then
    log "✅ Application health check passed"
else
    log "❌ Application health check failed"
fi

# Check ports
log "Open ports:"
netstat -tlnp | grep -E ":(80|3000|5432)" | tee -a $LOG_FILE

# Check firewall
log "=== Firewall Status ==="
if command -v ufw >/dev/null 2>&1; then
    log "UFW status:"
    ufw status | tee -a $LOG_FILE
else
    log "UFW not installed"
fi

# Check SSH configuration
log "=== SSH Configuration ==="
log "SSH service status:"
systemctl status ssh | head -10 | tee -a $LOG_FILE

log "SSH configuration:"
grep -E "^(Port|PermitRootLogin|PasswordAuthentication)" /etc/ssh/sshd_config | tee -a $LOG_FILE

# Check logs
log "=== Recent Logs ==="
log "System logs (last 50 lines):"
tail -50 /var/log/syslog | tee -a $LOG_FILE

if [ -f "/var/log/financieramente/deploy.log" ]; then
    log "Deployment logs (last 50 lines):"
    tail -50 /var/log/financieramente/deploy.log | tee -a $LOG_FILE
fi

# Check GitHub Actions connectivity (if possible)
log "=== External Connectivity ==="
log "Testing GitHub connectivity:"
if curl -f --connect-timeout 10 https://github.com > /dev/null 2>&1; then
    log "✅ GitHub connectivity OK"
else
    log "❌ GitHub connectivity failed"
fi

log "Testing Docker Hub connectivity:"
if curl -f --connect-timeout 10 https://hub.docker.com > /dev/null 2>&1; then
    log "✅ Docker Hub connectivity OK"
else
    log "❌ Docker Hub connectivity failed"
fi

log "=========================================="
log "Diagnostic completed for environment: $ENVIRONMENT"
log "Date: $(date)"
log "Log file: $LOG_FILE"
log "=========================================="

# Generate summary
log "=== DIAGNOSTIC SUMMARY ==="
log "Environment: $ENVIRONMENT"
log "Application Directory: $APP_DIR"
log "Docker Status: $(systemctl is-active docker)"
log "Application Health: $(curl -f --connect-timeout 5 http://localhost:3000/api/health > /dev/null 2>&1 && echo "OK" || echo "FAILED")"
log "Disk Usage: $(df -h / | tail -1 | awk '{print $5}')"
log "Memory Usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
log "========================"
