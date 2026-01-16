# SSL Certificate Setup (runs after EC2 and Route53 are ready)
resource "null_resource" "ssl_setup" {
  depends_on = [
    aws_instance.app,
    aws_eip_association.app,
    aws_route53_record.api
  ]

  # Wait for DNS propagation and EC2 to be ready
  provisioner "local-exec" {
    command = "sleep 60"
  }

  provisioner "remote-exec" {
    inline = [
      "sudo certbot --nginx -d ${var.subdomain}.${var.domain_name} --non-interactive --agree-tos --email admin@${var.domain_name} --redirect || echo 'Certbot failed, run manually later'",
      "sudo dnf install -y cronie",
      "(sudo crontab -l 2>/dev/null; echo '0 12 * * * /usr/bin/certbot renew --quiet') | sudo crontab - || true"
    ]

    connection {
      type        = "ssh"
      user        = "ec2-user"
      private_key = file("~/.ssh/${var.key_name}.pem")
      host        = aws_eip.app.public_ip
    }
  }

  triggers = {
    instance_id = aws_instance.app.id
  }
}
