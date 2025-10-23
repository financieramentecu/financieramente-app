# Production Environment Droplet
# This will only be created when create_prod_droplet = true
resource "digitalocean_droplet" "prod" {
	count	 = var.create_prod_droplet ? 1 : 0
	name	 = "financieramente-prod"
	size	 = var.droplet_size_prod
	image	 = "ubuntu-22-04-x64"
	region	 = var.region
	ssh_keys = [digitalocean_ssh_key.financieramente.id]

	tags = ["environment:production", "app:financieramente"]

	# User data script to setup the Droplet
	user_data = templatefile("${path.module}/scripts/setup-droplet.sh", {
		environment			= "prod"
		postgres_user		= var.postgres_user
		postgres_password	= var.postgres_password_prod
		postgres_db			= var.postgres_db_prod
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

