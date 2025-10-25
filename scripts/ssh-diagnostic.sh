#!/bin/bash

# SSH Diagnostic Script for GitHub Actions
# This script helps diagnose SSH connection issues

set -e

DROPLET_IP=${1:-"${{ secrets.QA_DROPLET_IP }}"}
LOG_FILE="/tmp/ssh-diagnostic.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "=========================================="
log "Starting SSH diagnostic for IP: $DROPLET_IP"
log "Date: $(date)"
log "=========================================="

# Check SSH agent
log "=== SSH Agent Status ==="
if command -v ssh-add >/dev/null 2>&1; then
    log "SSH agent status:"
    ssh-add -l || log "No keys loaded in SSH agent"
else
    log "❌ ssh-add command not found"
fi

# Check SSH configuration
log "=== SSH Configuration ==="
log "SSH version:"
ssh -V || log "❌ SSH command not found"

log "SSH config file:"
if [ -f ~/.ssh/config ]; then
    cat ~/.ssh/config
else
    log "No SSH config file found"
fi

# Check SSH directory and permissions
log "=== SSH Directory ==="
log "SSH directory contents:"
ls -la ~/.ssh/ || log "❌ SSH directory not found"

log "SSH directory permissions:"
stat ~/.ssh/ || log "❌ Cannot stat SSH directory"

# Check known_hosts
log "=== Known Hosts ==="
if [ -f ~/.ssh/known_hosts ]; then
    log "Known hosts file exists:"
    cat ~/.ssh/known_hosts
else
    log "❌ Known hosts file not found"
fi

# Test network connectivity
log "=== Network Connectivity ==="
log "Testing ping to $DROPLET_IP..."
if ping -c 3 $DROPLET_IP > /dev/null 2>&1; then
    log "✅ Ping successful"
else
    log "❌ Ping failed"
fi

# Test SSH port
log "Testing SSH port (22) connectivity..."
if nc -z -w5 $DROPLET_IP 22; then
    log "✅ SSH port is open"
else
    log "❌ SSH port is not accessible"
fi

# Test SSH connection with verbose output
log "=== SSH Connection Test ==="
log "Testing SSH connection with verbose output..."
ssh -vvv -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=no root@$DROPLET_IP "echo 'SSH test successful'" 2>&1 | tee -a $LOG_FILE || log "❌ SSH connection failed"

log "=========================================="
log "SSH diagnostic completed"
log "Log file: $LOG_FILE"
log "=========================================="
