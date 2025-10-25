#!/bin/bash

# Setup script for Digital Ocean Droplet
# This script runs during Droplet creation via cloud-init

set -e

# Configure non-interactive mode to prevent hanging
export DEBIAN_FRONTEND=noninteractive
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Log everything
exec > >(tee /var/log/setup-droplet.log)
exec 2>&1

echo "=========================================="
echo "Starting Droplet setup for environment: ${environment}"
echo "=========================================="

# Update system with timeout to prevent hanging
echo "Updating system packages..."
apt-get update

# Use timeout and force yes to prevent interactive prompts
echo "Running system upgrade with timeout..."
timeout 600 apt-get upgrade -y || {
    echo "Upgrade completed or timed out after 10 minutes"
    # Kill any hanging apt processes
    pkill -f apt-get || true
    sleep 2
}

# Install essential packages
echo "Installing essential packages..."
apt-get install -y \
	curl \
	wget \
	git \
	ufw \
	htop \
	unzip \
	software-properties-common \
	apt-transport-https \
	ca-certificates \
	gnupg \
	lsb-release

# Install Docker with timeout and error handling
echo "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package list with timeout
timeout 300 apt-get update || {
    echo "Package update timed out, continuing..."
    pkill -f apt-get || true
}

# Install Docker with timeout
echo "Installing Docker packages..."
timeout 600 apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin || {
    echo "Docker installation timed out, trying alternative method..."
    # Fallback to Ubuntu's docker.io package
    apt-get install -y docker.io docker-compose
}

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add root to docker group
usermod -aG docker root

# Install Docker Compose (standalone)
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Configure UFW Firewall
echo "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS (for production)
if [ "${environment}" = "prod" ]; then
	ufw allow 443/tcp
fi

# Enable UFW
ufw --force enable

# Create application directory
echo "Creating application directory..."
mkdir -p /opt/financieramente
cd /opt/financieramente

# Create environment file template
echo "Creating environment file template..."
cat > .env.template << EOF
# Environment: ${environment}
NODE_ENV=${environment}
POSTGRES_USER=${postgres_user}
POSTGRES_PASSWORD=${postgres_password}
POSTGRES_DB=${postgres_db}
DATABASE_URL=postgresql://${postgres_user}:${postgres_password}@postgres:5432/${postgres_db}
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF

# Create logs directory
mkdir -p /var/log/financieramente

# Configure log rotation
echo "Configuring log rotation..."
cat > /etc/logrotate.d/financieramente << EOF
/var/log/financieramente/*.log {
	daily
	missingok
	rotate 7
	compress
	notifempty
	create 644 root root
}
EOF

# Create systemd service for application (optional)
echo "Creating systemd service template..."
cat > /etc/systemd/system/financieramente.service << EOF
[Unit]
Description=Financieramente Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/financieramente
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Install Node.js (for running Prisma migrations)
echo "Installing Node.js..."
timeout 300 curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || {
    echo "Node.js setup timed out, trying alternative method..."
    apt-get install -y nodejs npm
}

timeout 300 apt-get install -y nodejs || {
    echo "Node.js installation timed out, continuing..."
}

# Install PM2 for process management (optional)
if command -v npm >/dev/null 2>&1; then
    echo "Installing PM2..."
    timeout 300 npm install -g pm2 || echo "PM2 installation failed, continuing..."
else
    echo "npm not available, skipping PM2 installation"
fi

# Create deployment script
echo "Creating deployment script..."
cat > /opt/financieramente/deploy.sh << 'EOF'
#!/bin/bash

set -e

echo "Starting deployment..."

# Pull latest code
echo "Pulling latest code from GitHub..."
git pull origin main

# Copy environment variables
echo "Setting up environment variables..."
cp .env.template .env

# Generate Prisma client
echo "Prisma client generation temporarily disabled - schema not configured yet"
# npx prisma generate

# Run database migrations
echo "Database migrations temporarily disabled - Prisma schema not configured yet"
# npx prisma migrate deploy

# Build and start containers
echo "Building and starting containers..."
docker-compose down || true
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Health check
echo "Performing health check..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
	echo "✅ Health check passed"
else
	echo "❌ Health check failed"
	exit 1
fi

echo "✅ Deployment completed successfully"
EOF

chmod +x /opt/financieramente/deploy.sh

# Set up SSH key for GitHub Actions
echo "Setting up SSH for GitHub Actions..."
mkdir -p /root/.ssh
chmod 700 /root/.ssh

# Create a placeholder for the SSH key (will be updated by GitHub Actions)
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Install fail2ban for additional security
echo "Installing fail2ban..."
timeout 300 apt-get install -y fail2ban || {
    echo "fail2ban installation timed out, continuing..."
}

# Configure fail2ban with CI/CD friendly settings
echo "Configuring fail2ban with CI/CD friendly settings..."
cat > /etc/fail2ban/jail.local << EOF
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

# Start services with error handling
systemctl enable fail2ban || echo "Failed to enable fail2ban"
systemctl start fail2ban || echo "Failed to start fail2ban"

# Create monitoring script
echo "Creating monitoring script..."
cat > /opt/financieramente/monitor.sh << 'EOF'
#!/bin/bash

# Simple monitoring script
echo "=== System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo "Disk Usage:"
df -h /
echo "Memory Usage:"
free -h
echo "Docker Containers:"
docker ps
echo "===================="
EOF

chmod +x /opt/financieramente/monitor.sh

# Set up cron job for monitoring
echo "Setting up monitoring cron job..."
echo "*/5 * * * * /opt/financieramente/monitor.sh >> /var/log/financieramente/monitor.log 2>&1" | crontab -

# Final system update
echo "Performing final system update..."
apt-get update
apt-get upgrade -y

# Clean up
echo "Cleaning up..."
apt-get autoremove -y || echo "Autoremove failed, continuing..."
apt-get autoclean || echo "Autoclean failed, continuing..."

# Final verification of installed services
echo "=========================================="
echo "Verifying installation..."
echo "=========================================="

# Check Docker
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker installed: $(docker --version)"
else
    echo "❌ Docker installation failed"
fi

# Check fail2ban
if systemctl is-active --quiet fail2ban; then
    echo "✅ fail2ban is running"
else
    echo "❌ fail2ban is not running"
fi

# Check SSH service
if systemctl is-active --quiet ssh; then
    echo "✅ SSH service is running"
else
    echo "❌ SSH service is not running"
fi

# Check disk space
echo "📊 Disk usage:"
df -h / | tail -1

# Check memory
echo "📊 Memory usage:"
free -h | head -2

echo "=========================================="
echo "Droplet setup completed!"
echo "Environment: ${environment}"
echo "Application directory: /opt/financieramente"
echo "Logs directory: /var/log/financieramente"
echo "Setup completed at: $(date)"
echo "=========================================="
