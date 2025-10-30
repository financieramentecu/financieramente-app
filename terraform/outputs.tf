output "qa_droplet_ip" {
  description = "Public IP address of QA Droplet"
  value       = digitalocean_droplet.qa.ipv4_address
}

output "qa_droplet_id" {
  description = "ID of QA Droplet"
  value       = digitalocean_droplet.qa.id
}

output "prod_droplet_ip" {
  description = "Public IP address of Production Droplet"
  value       = var.create_prod_droplet ? digitalocean_droplet.prod[0].ipv4_address : "Not created yet (set create_prod_droplet = true)"
}

output "prod_droplet_id" {
  description = "ID of Production Droplet"
  value       = var.create_prod_droplet ? digitalocean_droplet.prod[0].id : "Not created yet"
}

output "ssh_connection_qa" {
  description = "SSH connection command for QA"
  value       = "ssh root@${digitalocean_droplet.qa.ipv4_address} -i ~/.ssh/droplet_deploy"
}

output "ssh_connection_prod" {
  description = "SSH connection command for Production"
  value       = var.create_prod_droplet ? "ssh root@${digitalocean_droplet.prod[0].ipv4_address} -i ~/.ssh/droplet_deploy" : "Not created yet"
}

output "qa_url" {
  description = "URL to access QA environment"
  value       = "http://${digitalocean_droplet.qa.ipv4_address}"
}

output "prod_url" {
  description = "URL to access Production environment"
  value       = var.create_prod_droplet ? "http://${digitalocean_droplet.prod[0].ipv4_address}" : "Not created yet"
}

output "qa_domain_url" {
  description = "QA Domain URL"
  value       = "https://${var.qa_domain_name}"
}

output "prod_domain_url" {
  description = "Production Domain URL"
  value       = var.create_prod_droplet ? "https://${var.prod_domain_name}" : "Not created yet"
}

output "environment_status" {
  description = "Status of environments"
  value       = <<-EOT
		
		========================================
		FINANCIERAMENTE - INFRASTRUCTURE STATUS
		========================================
		
		QA Environment:		✓ Active
		QA IP Address:		${digitalocean_droplet.qa.ipv4_address}
		QA URL (IP):			http://${digitalocean_droplet.qa.ipv4_address}
		QA Domain:			https://${var.qa_domain_name}
		QA SSH:				ssh root@${digitalocean_droplet.qa.ipv4_address} -i ~/.ssh/droplet_deploy
		
		Production Environment:	${var.create_prod_droplet ? "✓ Active" : "✗ Not created (set create_prod_droplet = true)"}
		${var.create_prod_droplet ? "Prod IP Address:		${digitalocean_droplet.prod[0].ipv4_address}" : ""}
		${var.create_prod_droplet ? "Prod URL (IP):		http://${digitalocean_droplet.prod[0].ipv4_address}" : ""}
		${var.create_prod_droplet ? "Prod Domain:		https://${var.prod_domain_name}" : ""}
		${var.create_prod_droplet ? "Prod SSH:			ssh root@${digitalocean_droplet.prod[0].ipv4_address} -i ~/.ssh/droplet_deploy" : ""}
		
		Next Steps:
		1. Configure SSL in QA: ssh to server and run setup-ssl.sh
		2. Add QA_DROPLET_IP to GitHub Secrets: ${digitalocean_droplet.qa.ipv4_address}
		${var.create_prod_droplet ? "3. Add PROD_DROPLET_IP to GitHub Secrets: ${digitalocean_droplet.prod[0].ipv4_address}" : "3. When ready, set create_prod_droplet = true and run terraform apply"}
		
		========================================
	EOT
}

