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
# Install CloudWatch Agent
# ============================================
echo "Installing CloudWatch Agent..."
dnf install -y amazon-cloudwatch-agent

# ============================================
# Create fetch-env.sh Script (saves to /home/ec2-user/.env.app)
# ============================================
cat > /home/ec2-user/fetch-env.sh << 'FETCH_ENV_SCRIPT'
#!/bin/bash
set -e

PROJECT_NAME="$1"
ENVIRONMENT="$2"
AWS_REGION="$3"
OUTPUT_FILE="$${4:-/home/ec2-user/app/.env}"

aws ssm get-parameters-by-path \
  --path "/$PROJECT_NAME/$ENVIRONMENT/" \
  --with-decryption \
  --region $AWS_REGION \
  --query "Parameters[*].[Name,Value]" \
  --output text | while read -r name value; do
    param_name=$(echo "$name" | awk -F'/' '{print $NF}')
    echo "$param_name=\"$value\""
done > $OUTPUT_FILE

echo "AWS_REGION=\"$AWS_REGION\"" >> $OUTPUT_FILE

chown ec2-user:ec2-user $OUTPUT_FILE
chmod 600 $OUTPUT_FILE
echo "Environment variables saved to $OUTPUT_FILE"
FETCH_ENV_SCRIPT

chmod +x /home/ec2-user/fetch-env.sh
chown ec2-user:ec2-user /home/ec2-user/fetch-env.sh

# Fetch environment variables to temp location (not in app folder)
echo "Fetching environment variables..."
/home/ec2-user/fetch-env.sh "$PROJECT_NAME" "$ENVIRONMENT" "$AWS_REGION" "/home/ec2-user/.env.app" || echo "Warning: Failed to fetch env vars"

# ============================================
# Setup GitHub Deploy Key from SSM
# ============================================
echo "Setting up GitHub SSH key..."
mkdir -p /home/ec2-user/.ssh
chmod 700 /home/ec2-user/.ssh

aws ssm get-parameter \
  --name "/$PROJECT_NAME/$ENVIRONMENT/GITHUB_DEPLOY_KEY" \
  --with-decryption \
  --region $AWS_REGION \
  --query "Parameter.Value" \
  --output text > /home/ec2-user/.ssh/id_ed25519 2>/dev/null && {
    chmod 600 /home/ec2-user/.ssh/id_ed25519
    chown ec2-user:ec2-user /home/ec2-user/.ssh/id_ed25519

    # Add GitHub to known_hosts
    ssh-keyscan -t ed25519 github.com >> /home/ec2-user/.ssh/known_hosts 2>/dev/null
    chown ec2-user:ec2-user /home/ec2-user/.ssh/known_hosts

    echo "GitHub SSH key configured successfully"
} || echo "Warning: GitHub deploy key not found in SSM"

chown -R ec2-user:ec2-user /home/ec2-user/.ssh

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
# Create PM2 ecosystem.config.js (in home, not app folder)
# ============================================
cat > /home/ec2-user/ecosystem.config.js << 'PM2_CONFIG'
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

chown ec2-user:ec2-user /home/ec2-user/ecosystem.config.js

# ============================================
# Create deploy.sh Script
# ============================================
cat > /home/ec2-user/deploy.sh << DEPLOY_SCRIPT
#!/bin/bash
set -e

APP_DIR=/home/ec2-user/app

# Fetch latest environment variables from SSM
echo "Fetching environment variables from SSM..."
~/fetch-env.sh "${project_name}" "${environment}" "${aws_region}" \$APP_DIR/.env

# Move ecosystem.config.js if exists (first deploy only)
[ -f /home/ec2-user/ecosystem.config.js ] && mv /home/ec2-user/ecosystem.config.js \$APP_DIR/

# Create logs directory
mkdir -p \$APP_DIR/logs

cd \$APP_DIR

pnpm install
pnpm build

pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
pm2 save

echo "Deploy complete!"
DEPLOY_SCRIPT

chmod +x /home/ec2-user/deploy.sh
chown ec2-user:ec2-user /home/ec2-user/deploy.sh

# ============================================
# Setup PM2 Startup
# ============================================
env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# ============================================
# Install and Configure pm2-logrotate
# ============================================
echo "Installing pm2-logrotate..."
su - ec2-user -c "pm2 install pm2-logrotate"
su - ec2-user -c "pm2 set pm2-logrotate:max_size 10M"
su - ec2-user -c "pm2 set pm2-logrotate:retain 7"
su - ec2-user -c "pm2 set pm2-logrotate:compress true"
su - ec2-user -c "pm2 set pm2-logrotate:rotateInterval '0 0 * * *'"

# ============================================
# Configure CloudWatch Agent
# ============================================
echo "Configuring CloudWatch Agent..."
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc

cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << CW_CONFIG
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ec2-user/app/logs/combined.log",
            "log_group_name": "/${project_name}/${environment}/app",
            "log_stream_name": "{instance_id}/combined",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S"
          },
          {
            "file_path": "/home/ec2-user/app/logs/error.log",
            "log_group_name": "/${project_name}/${environment}/app",
            "log_stream_name": "{instance_id}/error",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S"
          },
          {
            "file_path": "/home/ec2-user/app/logs/output.log",
            "log_group_name": "/${project_name}/${environment}/app",
            "log_stream_name": "{instance_id}/output",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S"
          }
        ]
      }
    }
  }
}
CW_CONFIG

# Start CloudWatch Agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

systemctl enable amazon-cloudwatch-agent

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
echo "2. Clone: git clone <repo> /home/ec2-user/app"
echo "3. Deploy: ~/deploy.sh"
echo "4. SSL: ~/setup-ssl.sh"
echo "============================================"
