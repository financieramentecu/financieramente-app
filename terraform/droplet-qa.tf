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

	# Wait for Droplet to be ready
	provisioner "remote-exec" {
		inline = [
			"cloud-init status --wait"
		]

		connection {
			type		= "ssh"
			user		= "root"
			private_key = file("~/.ssh/droplet_deploy")
			host		= self.ipv4_address
			timeout		= "5m"
		}
	}
}

