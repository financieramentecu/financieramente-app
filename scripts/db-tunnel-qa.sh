#!/bin/bash

# SSH Tunnel Helper Script for QA Database Access
# This script creates an SSH tunnel to access the QA PostgreSQL database locally

set -e

# Configuration
SSH_KEY="$HOME/.ssh/droplet_deploy"
LOCAL_PORT=5433
REMOTE_PORT=5432
QA_IP_FILE=".qa_droplet_ip"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
	echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
	echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
	echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
	echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if SSH key exists
check_ssh_key() {
	if [ ! -f "$SSH_KEY" ]; then
		print_error "SSH key not found at $SSH_KEY"
		print_status "Please generate the SSH key first:"
		echo "  ssh-keygen -t ed25519 -C 'github-actions-droplets' -f ~/.ssh/droplet_deploy"
		exit 1
	fi
}

# Function to get QA Droplet IP
get_qa_ip() {
	if [ -f "$QA_IP_FILE" ]; then
		cat "$QA_IP_FILE"
	else
		print_error "QA Droplet IP file not found: $QA_IP_FILE"
		print_status "Please run 'terraform output qa_droplet_ip' and save it to $QA_IP_FILE"
		print_status "Or set the QA_DROPLET_IP environment variable"
		exit 1
	fi
}

# Function to check if tunnel is already running
check_existing_tunnel() {
	if lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t >/dev/null; then
		print_warning "Port $LOCAL_PORT is already in use"
		print_status "Checking if it's our SSH tunnel..."
		
		PID=$(lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t)
		if ps -p $PID -o command= | grep -q "ssh.*$LOCAL_PORT"; then
			print_success "SSH tunnel is already running (PID: $PID)"
			return 0
		else
			print_error "Port $LOCAL_PORT is used by another process (PID: $PID)"
			print_status "Please stop the process or use a different port"
			exit 1
		fi
	fi
	return 1
}

# Function to create SSH tunnel
create_tunnel() {
	local qa_ip=$1
	
	print_status "Creating SSH tunnel to QA database..."
	print_status "Local port: $LOCAL_PORT"
	print_status "Remote: $qa_ip:$REMOTE_PORT"
	print_status "SSH key: $SSH_KEY"
	
	# Create the tunnel in background
	ssh -f -N -L $LOCAL_PORT:localhost:$REMOTE_PORT root@$qa_ip -i $SSH_KEY
	
	# Wait a moment for the tunnel to establish
	sleep 2
	
	# Check if tunnel was created successfully
	if lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t >/dev/null; then
		print_success "SSH tunnel created successfully!"
		print_status "You can now connect to PostgreSQL at:"
		echo "  Host: localhost"
		echo "  Port: $LOCAL_PORT"
		echo "  Database: financieramente_qa"
		echo "  Username: financieramente_user"
		echo "  Password: [from GitHub Secrets: POSTGRES_PASSWORD_QA]"
		echo ""
		print_status "For your .env.local file:"
		echo "  DATABASE_URL=\"postgresql://financieramente_user:[PASSWORD]@localhost:$LOCAL_PORT/financieramente_qa\""
		echo ""
		print_status "To stop the tunnel, run: ./scripts/db-tunnel-qa.sh stop"
	else
		print_error "Failed to create SSH tunnel"
		exit 1
	fi
}

# Function to stop SSH tunnel
stop_tunnel() {
	print_status "Stopping SSH tunnel..."
	
	# Find and kill SSH processes using our local port
	PIDS=$(lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t 2>/dev/null || true)
	
	if [ -n "$PIDS" ]; then
		for PID in $PIDS; do
			if ps -p $PID -o command= | grep -q "ssh.*$LOCAL_PORT"; then
				kill $PID
				print_success "SSH tunnel stopped (PID: $PID)"
			fi
		done
	else
		print_warning "No SSH tunnel found running on port $LOCAL_PORT"
	fi
}

# Function to show tunnel status
show_status() {
	if lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t >/dev/null; then
		PID=$(lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t)
		print_success "SSH tunnel is running (PID: $PID)"
		print_status "Port $LOCAL_PORT is forwarding to QA database"
	else
		print_warning "SSH tunnel is not running"
	fi
}

# Function to test database connection
test_connection() {
	if ! lsof -Pi :$LOCAL_PORT -sTCP:LISTEN -t >/dev/null; then
		print_error "SSH tunnel is not running"
		print_status "Run: $0 start"
		exit 1
	fi
	
	print_status "Testing database connection..."
	
	# Check if psql is available
	if ! command -v psql >/dev/null 2>&1; then
		print_warning "psql not found. Install PostgreSQL client to test connection:"
		echo "  brew install postgresql  # macOS"
		echo "  sudo apt-get install postgresql-client  # Ubuntu"
		return
	fi
	
	# Test connection (will prompt for password)
	print_status "Testing connection to localhost:$LOCAL_PORT..."
	if psql -h localhost -p $LOCAL_PORT -U financieramente_user -d financieramente_qa -c "SELECT 1;" >/dev/null 2>&1; then
		print_success "Database connection test successful!"
	else
		print_warning "Database connection test failed"
		print_status "Make sure you have the correct password from GitHub Secrets"
	fi
}

# Main script logic
main() {
	case "${1:-start}" in
		start)
			check_ssh_key
			
			# Get QA IP from environment variable or file
			if [ -n "$QA_DROPLET_IP" ]; then
				QA_IP="$QA_DROPLET_IP"
			else
				QA_IP=$(get_qa_ip)
			fi
			
			if ! check_existing_tunnel; then
				create_tunnel "$QA_IP"
			fi
			;;
		stop)
			stop_tunnel
			;;
		status)
			show_status
			;;
		test)
			test_connection
			;;
		restart)
			stop_tunnel
			sleep 2
			main start
			;;
		*)
			echo "Usage: $0 {start|stop|status|test|restart}"
			echo ""
			echo "Commands:"
			echo "  start   - Create SSH tunnel to QA database (default)"
			echo "  stop    - Stop the SSH tunnel"
			echo "  status  - Show tunnel status"
			echo "  test    - Test database connection"
			echo "  restart - Restart the SSH tunnel"
			echo ""
			echo "Environment variables:"
			echo "  QA_DROPLET_IP - IP address of QA Droplet (optional)"
			echo ""
			echo "Examples:"
			echo "  $0                    # Start tunnel"
			echo "  $0 start             # Start tunnel"
			echo "  $0 stop              # Stop tunnel"
			echo "  $0 status            # Check status"
			echo "  $0 test              # Test connection"
			echo "  QA_DROPLET_IP=1.2.3.4 $0 start  # Use specific IP"
			exit 1
			;;
	esac
}

# Run main function
main "$@"
