variable "digitalocean_token" {
	description = "Digital Ocean API Token"
	type		= string
	sensitive	= true
}

variable "ssh_public_key" {
	description = "SSH public key for accessing Droplets"
	type		= string
}

variable "postgres_password_qa" {
	description = "PostgreSQL password for QA environment"
	type		= string
	sensitive	= true
}

variable "postgres_password_prod" {
	description = "PostgreSQL password for Production environment"
	type		= string
	sensitive	= true
}

variable "create_prod_droplet" {
	description = "Whether to create Production Droplet (set to true when ready for production)"
	type		= bool
	default		= false
}

variable "region" {
	description = "Digital Ocean region"
	type		= string
	default		= "nyc3"
}

variable "droplet_size_qa" {
	description = "Droplet size for QA environment"
	type		= string
	default		= "s-1vcpu-1gb"	# $6/month
}

variable "droplet_size_prod" {
	description = "Droplet size for Production environment"
	type		= string
	default		= "s-2vcpu-4gb"	# $24/month
}

variable "postgres_user" {
	description = "PostgreSQL username"
	type		= string
	default		= "financieramente_user"
}

variable "postgres_db_qa" {
	description = "PostgreSQL database name for QA"
	type		= string
	default		= "financieramente_qa"
}

variable "postgres_db_prod" {
	description = "PostgreSQL database name for Production"
	type		= string
	default		= "financieramente_prod"
}

