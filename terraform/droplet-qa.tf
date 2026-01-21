# QA Environment Droplet
resource "digitalocean_droplet" "qa" {
	name	 = "financieramente-qa"
	size	 = var.droplet_size_qa
	image	 = "ubuntu-22-04-x64"
	region	 = var.region
	ssh_keys = [digitalocean_ssh_key.financieramente.id]

	tags = ["environment:qa", "app:financieramente"]

	# User data script to setup the Droplet
	user_data = templatefile("${path.module}/scripts/setup-droplet.sh", {
		environment			= "qa"
		postgres_user		= var.postgres_user
		postgres_password	= var.postgres_password_qa
		postgres_db			= var.postgres_db_qa
	})

	# Wait for cloud-init to complete and verify services
	provisioner "remote-exec" {
		inline = [
			"echo 'Waiting for cloud-init to complete...'",
			"cloud-init status --wait --long",
			"echo 'Verifying Docker installation...'",
			"docker --version || echo 'Docker not found'",
			"echo 'Verifying fail2ban installation...'",
			"systemctl is-active fail2ban || echo 'fail2ban not active'",
			"echo 'Verifying SSH service...'",
			"systemctl is-active ssh || echo 'SSH not active'",
			"echo 'Setup verification completed'"
		]

		connection {
			type		= "ssh"
			user		= "root"
			private_key = file("~/.ssh/droplet_deploy")
			host		= self.ipv4_address
			timeout		= "15m"
		}
	}

	lifecycle {
		create_before_destroy = false
	}
}

