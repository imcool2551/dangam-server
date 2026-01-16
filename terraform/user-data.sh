#!/bin/bash

# Log all output
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting user-data script at $(date)"

# Variables from Terraform
PROJECT_NAME="${project_name}"
ENVIRONMENT="${environment}"
AWS_REGION="${aws_region}"
NODE_VERSION="${node_version}"
APP_PORT="${app_port}"
DOMAIN_NAME="${domain_name}"

# ============================================
# Add Swap Memory (for t3.micro)
# ============================================
echo "Adding swap memory..."
dd if=/dev/zero of=/swapfile bs=128M count=16
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

# ============================================
# Install System Packages
# ============================================
echo "Updating system..."
dnf update -y

echo "Installing required packages..."
dnf install -y git nginx

echo "Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_${node_version}.x | bash -
dnf install -y nodejs

echo "Installing PM2 and pnpm..."
npm install -g pm2 pnpm

echo "Installing certbot..."
dnf install -y certbot python3-certbot-nginx

# ============================================
# Create App Directory
# ============================================
mkdir -p /home/ec2-user/app/logs
chown -R ec2-user:ec2-user /home/ec2-user/app

# ============================================
# Create fetch-env.sh Script
# ============================================
cat > /home/ec2-user/fetch-env.sh << 'FETCH_ENV_SCRIPT'
#!/bin/bash
set -e

PROJECT_NAME="$1"
ENVIRONMENT="$2"
AWS_REGION="$3"

aws ssm get-parameters-by-path \
  --path "/$PROJECT_NAME/$ENVIRONMENT/" \
  --with-decryption \
  --region $AWS_REGION \
  --query "Parameters[*].[Name,Value]" \
  --output text | while read -r name value; do
    param_name=$(echo "$name" | awk -F'/' '{print $NF}')
    echo "$param_name=\"$value\""
done > /home/ec2-user/app/.env

echo "AWS_REGION=\"$AWS_REGION\"" >> /home/ec2-user/app/.env

chown ec2-user:ec2-user /home/ec2-user/app/.env
chmod 600 /home/ec2-user/app/.env
echo "Environment variables fetched successfully"
FETCH_ENV_SCRIPT

chmod +x /home/ec2-user/fetch-env.sh
chown ec2-user:ec2-user /home/ec2-user/fetch-env.sh

# Fetch environment variables (don't fail if this errors)
echo "Fetching environment variables..."
/home/ec2-user/fetch-env.sh "$PROJECT_NAME" "$ENVIRONMENT" "$AWS_REGION" || echo "Warning: Failed to fetch env vars"

# ============================================
# Configure Nginx
# ============================================
echo "Configuring Nginx..."
cat > /etc/nginx/conf.d/app.conf << NGINX_CONF
server {
    listen 80;
    server_name ${domain_name} _;

    location / {
        proxy_pass http://localhost:${app_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_CONF

rm -f /etc/nginx/conf.d/default.conf
systemctl start nginx
systemctl enable nginx

# ============================================
# Create deploy.sh Script
# ============================================
cat > /home/ec2-user/deploy.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

cd /home/ec2-user/app

pnpm install
pnpm build

pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
pm2 save
DEPLOY_SCRIPT

chmod +x /home/ec2-user/deploy.sh
chown ec2-user:ec2-user /home/ec2-user/deploy.sh

# ============================================
# Create PM2 ecosystem.config.js
# ============================================
cat > /home/ec2-user/app/ecosystem.config.js << 'PM2_CONFIG'
module.exports = {
  apps: [{
    name: 'dangam-server',
    script: 'dist/src/main.js',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: '/home/ec2-user/app/logs/error.log',
    out_file: '/home/ec2-user/app/logs/output.log',
    log_file: '/home/ec2-user/app/logs/combined.log',
    time: true
  }]
};
PM2_CONFIG

chown ec2-user:ec2-user /home/ec2-user/app/ecosystem.config.js

# ============================================
# Setup PM2 Startup
# ============================================
env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# ============================================
# Create SSL Setup Script
# ============================================
cat > /home/ec2-user/setup-ssl.sh << SETUP_SSL
#!/bin/bash
set -e

sudo certbot --nginx -d ${domain_name} --non-interactive --agree-tos --email admin@${domain_name} --redirect

echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

echo "SSL setup complete!"
SETUP_SSL

chmod +x /home/ec2-user/setup-ssl.sh
chown ec2-user:ec2-user /home/ec2-user/setup-ssl.sh

# ============================================
# Done
# ============================================
echo "============================================"
echo "User-data script completed at $(date)"
echo "============================================"
echo "Next steps:"
echo "1. SSH: ssh -i ~/.ssh/dangam-key.pem ec2-user@<EIP>"
echo "2. Clone: cd /home/ec2-user/app && git clone <repo> ."
echo "3. Deploy: ./deploy.sh"
echo "4. SSL: ./setup-ssl.sh"
echo "============================================"
