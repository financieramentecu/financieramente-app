#!/bin/bash

# Utility script for Financieramente infrastructure management
# Provides common operations for managing the infrastructure

set -e

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

# Function to check if terraform is installed
check_terraform() {
	if ! command -v terraform >/dev/null 2>&1; then
		print_error "Terraform is not installed"
		print_status "Install Terraform: https://developer.hashicorp.com/terraform/downloads"
		exit 1
	fi
}

# Function to check if we're in the right directory
check_directory() {
	if [ ! -f "terraform/provider.tf" ]; then
		print_error "Please run this script from the project root directory"
		print_status "Expected to find terraform/provider.tf"
		exit 1
	fi
}

# Function to initialize Terraform
init_terraform() {
	print_status "Initializing Terraform..."
	cd terraform
	terraform init
	cd ..
	print_success "Terraform initialized"
}

# Function to show Terraform plan
plan_terraform() {
	print_status "Creating Terraform plan..."
	cd terraform
	terraform plan
	cd ..
}

# Function to apply Terraform
apply_terraform() {
	print_status "Applying Terraform configuration..."
	cd terraform
	terraform apply
	cd ..
	print_success "Terraform applied successfully"
}

# Function to show Terraform outputs
show_outputs() {
	print_status "Terraform outputs:"
	cd terraform
	terraform output
	cd ..
}

# Function to destroy infrastructure
destroy_terraform() {
	print_warning "This will destroy all infrastructure!"
	print_status "This action cannot be undone."
	read -p "Are you sure? Type 'yes' to continue: " confirm
	
	if [ "$confirm" = "yes" ]; then
		print_status "Destroying infrastructure..."
		cd terraform
		terraform destroy
		cd ..
		print_success "Infrastructure destroyed"
	else
		print_status "Operation cancelled"
	fi
}

# Function to show infrastructure status
show_status() {
	print_status "Infrastructure Status:"
	echo ""
	
	cd terraform
	
	# Check if terraform state exists
	if [ ! -f ".terraform/terraform.tfstate" ]; then
		print_warning "No Terraform state found. Run 'terraform init' first."
		cd ..
		return
	fi
	
	# Show current state
	print_status "Current resources:"
	terraform show -no-color | grep -E "(digitalocean_droplet|digitalocean_firewall)" || true
	
	echo ""
	print_status "Outputs:"
	terraform output -no-color || true
	
	cd ..
}

# Function to connect to QA Droplet
connect_qa() {
	print_status "Connecting to QA Droplet..."
	
	cd terraform
	QA_IP=$(terraform output -raw qa_droplet_ip 2>/dev/null || echo "")
	cd ..
	
	if [ -z "$QA_IP" ]; then
		print_error "Could not get QA Droplet IP. Make sure QA environment is deployed."
		exit 1
	fi
	
	print_status "Connecting to QA Droplet at $QA_IP..."
	ssh root@$QA_IP -i ~/.ssh/droplet_deploy
}

# Function to connect to Production Droplet
connect_prod() {
	print_status "Connecting to Production Droplet..."
	
	cd terraform
	PROD_IP=$(terraform output -raw prod_droplet_ip 2>/dev/null || echo "")
	cd ..
	
	if [ -z "$PROD_IP" ]; then
		print_error "Could not get Production Droplet IP. Make sure Production environment is deployed."
		exit 1
	fi
	
	print_status "Connecting to Production Droplet at $PROD_IP..."
	ssh root@$PROD_IP -i ~/.ssh/droplet_deploy
}

# Function to show logs from QA
logs_qa() {
	print_status "Showing QA logs..."
	
	cd terraform
	QA_IP=$(terraform output -raw qa_droplet_ip 2>/dev/null || echo "")
	cd ..
	
	if [ -z "$QA_IP" ]; then
		print_error "Could not get QA Droplet IP. Make sure QA environment is deployed."
		exit 1
	fi
	
	print_status "Connecting to QA Droplet at $QA_IP to show logs..."
	ssh root@$QA_IP -i ~/.ssh/droplet_deploy "cd /opt/financieramente && docker-compose -f docker-compose.qa.yml logs -f"
}

# Function to show logs from Production
logs_prod() {
	print_status "Showing Production logs..."
	
	cd terraform
	PROD_IP=$(terraform output -raw prod_droplet_ip 2>/dev/null || echo "")
	cd ..
	
	if [ -z "$PROD_IP" ]; then
		print_error "Could not get Production Droplet IP. Make sure Production environment is deployed."
		exit 1
	fi
	
	print_status "Connecting to Production Droplet at $PROD_IP to show logs..."
	ssh root@$PROD_IP -i ~/.ssh/droplet_deploy "cd /opt/financieramente && docker-compose -f docker-compose.prod.yml logs -f"
}

# Function to restart QA services
restart_qa() {
	print_status "Restarting QA services..."
	
	cd terraform
	QA_IP=$(terraform output -raw qa_droplet_ip 2>/dev/null || echo "")
	cd ..
	
	if [ -z "$QA_IP" ]; then
		print_error "Could not get QA Droplet IP. Make sure QA environment is deployed."
		exit 1
	fi
	
	print_status "Restarting services on QA Droplet at $QA_IP..."
	ssh root@$QA_IP -i ~/.ssh/droplet_deploy "cd /opt/financieramente && docker-compose -f docker-compose.qa.yml restart"
	print_success "QA services restarted"
}

# Function to restart Production services
restart_prod() {
	print_status "Restarting Production services..."
	
	cd terraform
	PROD_IP=$(terraform output -raw prod_droplet_ip 2>/dev/null || echo "")
	cd ..
	
	if [ -z "$PROD_IP" ]; then
		print_error "Could not get Production Droplet IP. Make sure Production environment is deployed."
		exit 1
	fi
	
	print_status "Restarting services on Production Droplet at $PROD_IP..."
	ssh root@$PROD_IP -i ~/.ssh/droplet_deploy "cd /opt/financieramente && docker-compose -f docker-compose.prod.yml restart"
	print_success "Production services restarted"
}

# Function to show help
show_help() {
	echo "Financieramente Infrastructure Management Script"
	echo ""
	echo "Usage: $0 <command>"
	echo ""
	echo "Commands:"
	echo "  init        - Initialize Terraform"
	echo "  plan        - Show Terraform plan"
	echo "  apply       - Apply Terraform configuration"
	echo "  destroy     - Destroy all infrastructure"
	echo "  status      - Show infrastructure status"
	echo "  outputs     - Show Terraform outputs"
	echo "  connect-qa  - SSH to QA Droplet"
	echo "  connect-prod- SSH to Production Droplet"
	echo "  logs-qa     - Show QA application logs"
	echo "  logs-prod   - Show Production application logs"
	echo "  restart-qa  - Restart QA services"
	echo "  restart-prod- Restart Production services"
	echo "  help        - Show this help message"
	echo ""
	echo "Examples:"
	echo "  $0 init              # Initialize Terraform"
	echo "  $0 plan              # Show what will be created"
	echo "  $0 apply             # Create infrastructure"
	echo "  $0 status            # Show current status"
	echo "  $0 connect-qa        # SSH to QA server"
	echo "  $0 logs-qa           # Watch QA logs"
	echo ""
	echo "Prerequisites:"
	echo "  - Terraform installed"
	echo "  - SSH key at ~/.ssh/droplet_deploy"
	echo "  - terraform.tfvars configured"
}

# Main script logic
main() {
	check_terraform
	check_directory
	
	case "${1:-help}" in
		init)
			init_terraform
			;;
		plan)
			plan_terraform
			;;
		apply)
			apply_terraform
			;;
		destroy)
			destroy_terraform
			;;
		status)
			show_status
			;;
		outputs)
			show_outputs
			;;
		connect-qa)
			connect_qa
			;;
		connect-prod)
			connect_prod
			;;
		logs-qa)
			logs_qa
			;;
		logs-prod)
			logs_prod
			;;
		restart-qa)
			restart_qa
			;;
		restart-prod)
			restart_prod
			;;
		help|--help|-h)
			show_help
			;;
		*)
			print_error "Unknown command: $1"
			echo ""
			show_help
			exit 1
			;;
	esac
}

# Run main function
main "$@"
