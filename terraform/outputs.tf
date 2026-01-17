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

output "cloudwatch_dashboard_url" {
  description = "CloudWatch Dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${var.project_name}-${var.environment}"
}

output "cloudfront_url" {
  description = "CloudFront CDN URL for S3"
  value       = "https://${aws_cloudfront_distribution.s3_distribution.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID"
  value       = aws_cloudfront_distribution.s3_distribution.id
}

output "next_steps" {
  description = "Next steps after deployment"
  value       = <<-EOT

    1. SSH into EC2:
       ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.app.public_ip}

    2. Clone your repository:
       git clone git@github.com:imcool2551/dangam-server.git /home/ec2-user/app

    3. Run deploy script:
       ~/deploy.sh

    4. Confirm SNS subscription:
       Check ${var.alert_email} for AWS SNS confirmation email

  EOT
}
