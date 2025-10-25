# SSH Key resource for accessing Droplets
resource "digitalocean_ssh_key" "financieramente" {
	name	   = "financieramente-deploy-key"
	public_key = var.ssh_public_key
}

# Firewall for QA environment
resource "digitalocean_firewall" "qa" {
	name = "financieramente-qa-firewall"

	droplet_ids = [digitalocean_droplet.qa.id]

	# SSH access
	inbound_rule {
		protocol		 = "tcp"
		port_range		 = "22"
		source_addresses = ["0.0.0.0/0", "::/0"]
	}

	# HTTP access
	inbound_rule {
		protocol		 = "tcp"
		port_range		 = "80"
		source_addresses = ["0.0.0.0/0", "::/0"]
	}

	# Allow all outbound traffic
	outbound_rule {
		protocol			  = "tcp"
		port_range			  = "1-65535"
		destination_addresses = ["0.0.0.0/0", "::/0"]
	}

	outbound_rule {
		protocol			  = "udp"
		port_range			  = "1-65535"
		destination_addresses = ["0.0.0.0/0", "::/0"]
	}

	outbound_rule {
		protocol			  = "icmp"
		destination_addresses = ["0.0.0.0/0", "::/0"]
	}
}

# Firewall for Production environment (includes HTTPS)
resource "digitalocean_firewall" "prod" {
	count = var.create_prod_droplet ? 1 : 0
	name  = "financieramente-prod-firewall"

	droplet_ids = [digitalocean_droplet.prod[0].id]

	# SSH access
	inbound_rule {
		protocol		 = "tcp"
		port_range		 = "22"
		source_addresses = ["0.0.0.0/0", "::/0"]
	}

	# HTTP access
	inbound_rule {
		protocol		 = "tcp"
		port_range		 = "80"
		source_addresses = ["0.0.0.0/0", "::/0"]
	}

	# HTTPS access
	inbound_rule {
		protocol		 = "tcp"
		port_range		 = "443"
		source_addresses = ["0.0.0.0/0", "::/0"]
	}

	# Allow all outbound traffic
	outbound_rule {
		protocol			  = "tcp"
		port_range			  = "1-65535"
		destination_addresses = ["0.0.0.0/0", "::/0"]
	}

	outbound_rule {
		protocol			  = "udp"
		port_range			  = "1-65535"
		destination_addresses = ["0.0.0.0/0", "::/0"]
	}

	outbound_rule {
		protocol			  = "icmp"
		destination_addresses = ["0.0.0.0/0", "::/0"]
	}
}

