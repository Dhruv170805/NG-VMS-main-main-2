terraform {
  required_version = ">= 1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. Network Topology (VPC)
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "ngvms-vpc-${var.environment}"
    Environment = var.environment
  }
}

# 2. Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = {
    Name = "ngvms-subnet-public-${var.environment}"
  }
}

# 3. Internet Gateway & Route Tables
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "ngvms-igw-${var.environment}"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "ngvms-rt-public-${var.environment}"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# 4. Security Group for hosting node
resource "aws_security_group" "web_host" {
  name        = "ngvms-sg-host-${var.environment}"
  description = "Allow inbound traffic for SSH, HTTP, HTTPS, and socket relays"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Local dev testing backend"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Local dev testing frontend"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ngvms-security-group-${var.environment}"
  }
}

# 5. Determine stable Ubuntu 22.04 LTS AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 6. EC2 Host Instance
resource "aws_instance" "host" {
  ami                    = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_host.id]

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # Automate Docker + Compose setup on instance startup
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y apt-transport-https ca-certificates curl software-properties-common git
              
              # Install Docker
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
              echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
              apt-get update -y
              apt-get install -y docker-ce docker-ce-cli containerd.io
              
              # Install Docker Compose v2
              mkdir -p /usr/local/lib/docker/cli-plugins
              curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
              chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
              ln -s /usr/local/lib/docker/cli-plugins/docker-compose /usr/bin/docker-compose
              
              # Start docker service
              systemctl enable docker
              systemctl start docker
              
              # Create directories for mounting
              mkdir -p /opt/ngvms
              EOF

  tags = {
    Name        = "ngvms-host-${var.environment}"
    Environment = var.environment
  }
}

# 7. Reserve Static Public IP
resource "aws_eip" "host_ip" {
  instance = aws_instance.host.id
  domain   = "vpc"

  tags = {
    Name = "ngvms-eip-${var.environment}"
  }
}

# Outputs
output "public_ip" {
  value       = aws_eip.host_ip.public_ip
  description = "Elastic Public IP of the hosted NG-VMS stack"
}

output "ssh_command" {
  value       = "ssh -i <your-private-key.pem> ubuntu@${aws_eip.host_ip.public_ip}"
  description = "SSH shell login connection string"
}
