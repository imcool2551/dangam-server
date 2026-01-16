# Get existing Route53 hosted zone
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# A record for API subdomain -> EIP
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${var.subdomain}.${var.domain_name}"
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}

# Optional: Root domain record (if you want growdangams.com to also point to EC2)
# resource "aws_route53_record" "root" {
#   zone_id = data.aws_route53_zone.main.zone_id
#   name    = var.domain_name
#   type    = "A"
#   ttl     = 300
#   records = [aws_eip.app.public_ip]
# }
