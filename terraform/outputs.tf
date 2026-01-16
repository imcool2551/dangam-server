# Outputs
output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "elastic_ip" {
  description = "Elastic IP address"
  value       = aws_eip.app.public_ip
}

output "api_url" {
  description = "API URL"
  value       = "https://${var.subdomain}.${var.domain_name}"
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.app.public_ip}"
}

output "ssm_connect_command" {
  description = "SSM Session Manager command"
  value       = "aws ssm start-session --target ${aws_instance.app.id}"
}

output "next_steps" {
  description = "Next steps after deployment"
  value       = <<-EOT

    1. SSH into EC2:
       ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.app.public_ip}

    2. Clone your repository:
       cd /home/ec2-user/app
       git clone <your-repo-url> .

    3. Run deploy script:
       ./deploy.sh

    4. Setup SSL (after DNS propagates):
       ./setup-ssl.sh

  EOT
}
