#!/bin/bash

# Script para aplicar configuración de fail2ban mejorada al droplet existente
# Este script se puede ejecutar manualmente en el servidor para aplicar los cambios

set -e

echo "=========================================="
echo "Applying fail2ban configuration update"
echo "Date: $(date)"
echo "=========================================="

# Backup current configuration
echo "Creating backup of current fail2ban configuration..."
cp /etc/fail2ban/jail.local /etc/fail2ban/jail.local.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "No existing jail.local found"

# Apply new configuration
echo "Applying new fail2ban configuration..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1800
findtime = 300
maxretry = 10

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 10
ignoreip = 127.0.0.1/8 ::1 140.82.112.0/20 185.199.108.0/22 192.30.252.0/22
EOF

# Restart fail2ban to apply changes
echo "Restarting fail2ban service..."
systemctl restart fail2ban

# Check status
echo "Checking fail2ban status..."
systemctl status fail2ban --no-pager -l

# Show current configuration
echo "Current fail2ban configuration:"
cat /etc/fail2ban/jail.local

# Show banned IPs (should be empty after restart)
echo "Currently banned IPs:"
fail2ban-client status sshd 2>/dev/null || echo "No banned IPs"

echo "=========================================="
echo "✅ fail2ban configuration updated successfully"
echo "Date: $(date)"
echo "=========================================="
