output "qa_droplet_ip" {
	description = "Public IP address of QA Droplet"
	value		= digitalocean_droplet.qa.ipv4_address
}

output "qa_droplet_id" {
	description = "ID of QA Droplet"
	value		= digitalocean_droplet.qa.id
}

output "prod_droplet_ip" {
	description = "Public IP address of Production Droplet"
	value		= var.create_prod_droplet ? digitalocean_droplet.prod[0].ipv4_address : "Not created yet (set create_prod_droplet = true)"
}

output "prod_droplet_id" {
	description = "ID of Production Droplet"
	value		= var.create_prod_droplet ? digitalocean_droplet.prod[0].id : "Not created yet"
}

output "ssh_connection_qa" {
	description = "SSH connection command for QA"
	value		= "ssh root@${digitalocean_droplet.qa.ipv4_address} -i ~/.ssh/droplet_deploy"
}

output "ssh_connection_prod" {
	description = "SSH connection command for Production"
	value		= var.create_prod_droplet ? "ssh root@${digitalocean_droplet.prod[0].ipv4_address} -i ~/.ssh/droplet_deploy" : "Not created yet"
}

output "qa_url" {
	description = "URL to access QA environment"
	value		= "http://${digitalocean_droplet.qa.ipv4_address}"
}

output "prod_url" {
	description = "URL to access Production environment"
	value		= var.create_prod_droplet ? "http://${digitalocean_droplet.prod[0].ipv4_address}" : "Not created yet"
}

output "environment_status" {
	description = "Status of environments"
	value		= <<-EOT
		
		========================================
		FINANCIERAMENTE - INFRASTRUCTURE STATUS
		========================================
		
		QA Environment:		✓ Active
		QA IP Address:		${digitalocean_droplet.qa.ipv4_address}
		QA URL:				http://${digitalocean_droplet.qa.ipv4_address}
		QA SSH:				ssh root@${digitalocean_droplet.qa.ipv4_address} -i ~/.ssh/droplet_deploy
		
		Production Environment:	${var.create_prod_droplet ? "✓ Active" : "✗ Not created (set create_prod_droplet = true)"}
		${var.create_prod_droplet ? "Prod IP Address:		${digitalocean_droplet.prod[0].ipv4_address}" : ""}
		${var.create_prod_droplet ? "Prod URL:			http://${digitalocean_droplet.prod[0].ipv4_address}" : ""}
		${var.create_prod_droplet ? "Prod SSH:			ssh root@${digitalocean_droplet.prod[0].ipv4_address} -i ~/.ssh/droplet_deploy" : ""}
		
		Next Steps:
		1. Add QA_DROPLET_IP to GitHub Secrets: ${digitalocean_droplet.qa.ipv4_address}
		${var.create_prod_droplet ? "2. Add PROD_DROPLET_IP to GitHub Secrets: ${digitalocean_droplet.prod[0].ipv4_address}" : "2. When ready, set create_prod_droplet = true and run terraform apply"}
		
		========================================
	EOT
}

