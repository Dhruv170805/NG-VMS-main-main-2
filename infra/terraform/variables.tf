variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Target AWS region"
}

variable "instance_type" {
  type        = string
  default     = "t3.medium"
  description = "EC2 instance size"
}

variable "ami_id" {
  type        = string
  default     = "" # Will default to Ubuntu 22.04 LTS AMI in us-east-1 in main.tf if empty
  description = "Custom AMI ID"
}

variable "key_name" {
  type        = string
  description = "AWS SSH Key Pair name"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Target environment name"
}
