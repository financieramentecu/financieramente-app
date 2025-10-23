#!/bin/bash

# Setup script for Digital Ocean Droplet
# This script runs during Droplet creation via cloud-init

set -e

# Log everything
exec > >(tee /var/log/setup-droplet.log)
exec 2>&1

echo "=========================================="
echo "Starting Droplet setup for environment: ${environment}"
echo "=========================================="

# Update system
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

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

# Install Docker
echo "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

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
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 for process management (optional)
npm install -g pm2

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
echo "Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

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
apt-get install -y fail2ban

# Configure fail2ban
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl start fail2ban

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
apt-get autoremove -y
apt-get autoclean

echo "=========================================="
echo "Droplet setup completed successfully!"
echo "Environment: ${environment}"
echo "Application directory: /opt/financieramente"
echo "Logs directory: /var/log/financieramente"
echo "=========================================="

# Signal cloud-init that we're done
cloud-init status --wait

echo "Setup script completed at $(date)"
