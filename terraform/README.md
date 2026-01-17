# Dangam Server - Terraform Infrastructure

## Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud (ap-northeast-2)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐     ┌─────────────────────────────────────────────────────┐   │
│  │   Route53   │     │                    Default VPC                       │   │
│  │  Hosted Zone│     │  ┌─────────────────────────────────────────────┐    │   │
│  │             │     │  │              Security Group                  │    │   │
│  │ api.grow... │────▶│  │         (22/80/443 Inbound)                 │    │   │
│  └─────────────┘     │  │  ┌───────────────────────────────────────┐  │    │   │
│         │            │  │  │           EC2 (t3.micro)              │  │    │   │
│         │            │  │  │  ┌─────────────────────────────────┐  │  │    │   │
│         ▼            │  │  │  │  Nginx (Reverse Proxy + SSL)    │  │  │    │   │
│  ┌─────────────┐     │  │  │  │           Port 80/443           │  │  │    │   │
│  │  Elastic IP │─────│──│──│─▶│              │                  │  │  │    │   │
│  │             │     │  │  │  │              ▼                  │  │  │    │   │
│  └─────────────┘     │  │  │  │  ┌───────────────────────────┐  │  │  │    │   │
│                      │  │  │  │  │   PM2 Process Manager     │  │  │  │    │   │
│                      │  │  │  │  │   └─ NestJS App (:3000)   │  │  │  │    │   │
│                      │  │  │  │  └───────────────────────────┘  │  │  │    │   │
│                      │  │  │  │              │                  │  │  │    │   │
│                      │  │  │  │              ▼                  │  │  │    │   │
│                      │  │  │  │  ┌───────────────────────────┐  │  │  │    │   │
│                      │  │  │  │  │   CloudWatch Agent        │  │  │  │    │   │
│                      │  │  │  │  │   (Log Collector)         │  │  │  │    │   │
│                      │  │  │  │  └───────────────────────────┘  │  │  │    │   │
│                      │  │  │  └─────────────────────────────────┘  │  │    │   │
│                      │  │  └───────────────────────────────────────┘  │    │   │
│                      │  └─────────────────────────────────────────────┘    │   │
│                      └─────────────────────────────────────────────────────┘   │
│                                           │                                     │
│              ┌────────────────────────────┼────────────────────────────┐       │
│              │                            │                            │       │
│              ▼                            ▼                            ▼       │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐ │
│  │ SSM Parameter Store │    │   CloudWatch Logs   │    │    S3 Bucket        │ │
│  │                     │    │                     │    │   (dangam-diary)    │ │
│  │ /dangam-server/prod/│    │ /dangam-server/prod │    │         │           │ │
│  │  - DB_URI           │    │    /app             │    │         │           │ │
│  │  - JWT_SECRET       │    │                     │    │         ▼           │ │
│  │  - KAKAO_REST_API.. │    │  Metric Filters     │    │  ┌───────────────┐  │ │
│  │  - FIREBASE_SA..    │    │  └─ Error Count     │    │  │  CloudFront   │  │ │
│  │  - GITHUB_DEPLOY..  │    │                     │    │  │  Distribution │  │ │
│  │  - AWS_S3_BUCKET..  │    │  Alarms:            │    │  │  (CDN)        │  │ │
│  │  - CLOUDFRONT_DO..  │    │  └─ Error Threshold │    │  └───────────────┘  │ │
│  └─────────────────────┘    └─────────────────────┘    └─────────────────────┘ │
│                                       │                                         │
│                                       ▼                                         │
│                            ┌─────────────────────┐                             │
│                            │     SNS Topic       │                             │
│                            │   (Email Alerts)    │                             │
│                            └─────────────────────┘                             │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                               us-east-1 (Billing)                               │
│  ┌─────────────────────┐    ┌─────────────────────┐                            │
│  │  Billing Alarm      │───▶│   SNS Topic         │                            │
│  │  (> $30/month)      │    │   (Billing Alerts)  │                            │
│  └─────────────────────┘    └─────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Terraform File Structure

```
terraform/
├── main.tf              # Provider 설정 (AWS ap-northeast-2, us-east-1)
├── variables.tf         # 입력 변수 정의
├── outputs.tf           # 출력값 정의
│
├── vpc.tf               # Default VPC 참조
├── security-groups.tf   # Security Group (SSH/HTTP/HTTPS)
├── ec2.tf               # EC2 인스턴스 + Elastic IP
├── iam.tf               # IAM Role/Policy (SSM, CloudWatch 접근)
├── route53.tf           # DNS A 레코드 (api.growdangams.com)
├── ssl.tf               # SSL 인증서 자동 설정 (Certbot)
│
├── ssm.tf               # SSM Parameter Store (환경변수/시크릿)
├── cloudwatch-logs.tf   # CloudWatch Log Group + 에러 알람
├── monitoring.tf        # CloudWatch Dashboard + SNS 알림
├── cloudfront.tf        # S3용 CloudFront CDN
│
├── user-data.sh         # EC2 초기화 스크립트
└── terraform.tfvars     # 실제 변수값 (gitignore)
```

### File Dependencies

```
main.tf
    │
    ├──▶ vpc.tf ──▶ security-groups.tf ──┐
    │                                     │
    ├──▶ iam.tf ─────────────────────────┼──▶ ec2.tf ──┬──▶ route53.tf
    │                                     │            │
    └──▶ user-data.sh ───────────────────┘            └──▶ ssl.tf
                                                            │
                                                            ▼
    ssm.tf ◀───────────────────────────────── (env vars fetched at deploy)

    cloudfront.tf ◀─── S3 bucket reference

    cloudwatch-logs.tf ──┬──▶ monitoring.tf ──▶ SNS alerts
                         │
                         └──▶ CloudWatch Agent (in user-data.sh)
```

## EC2 Deployment Flow (user-data.sh)

EC2 인스턴스가 처음 시작될 때 `user-data.sh` 스크립트가 자동 실행됩니다.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EC2 Instance Boot (user-data.sh)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. System Preparation                                                        │
│    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐   │
│    │ Add Swap Memory │───▶│   dnf update    │───▶│  Install Packages   │   │
│    │   (2GB swap)    │    │                 │    │  git, nginx, certbot│   │
│    └─────────────────┘    └─────────────────┘    └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Node.js Environment Setup                                                 │
│    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐   │
│    │  Install Node.js│───▶│  Install PM2    │───▶│  Install pnpm       │   │
│    │  (v20.x)        │    │  + pm2-logrotate│    │                     │   │
│    └─────────────────┘    └─────────────────┘    └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. Security & Credentials                                                    │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │                    SSM Parameter Store                               │  │
│    │    ┌──────────────────┐         ┌──────────────────────────────┐   │  │
│    │    │ GITHUB_DEPLOY_KEY│────────▶│ /home/ec2-user/.ssh/id_ed25519│   │  │
│    │    └──────────────────┘         └──────────────────────────────┘   │  │
│    │    ┌──────────────────┐         ┌──────────────────────────────┐   │  │
│    │    │ All env vars     │────────▶│ /home/ec2-user/.env.app       │   │  │
│    │    └──────────────────┘         └──────────────────────────────┘   │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. Nginx Configuration                                                       │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │  /etc/nginx/conf.d/app.conf                                          │  │
│    │  ┌─────────────────────────────────────────────────────────────┐    │  │
│    │  │  listen 80;                                                  │    │  │
│    │  │  server_name api.growdangams.com;                           │    │  │
│    │  │  location / {                                                │    │  │
│    │  │      proxy_pass http://localhost:3000;                      │    │  │
│    │  │  }                                                          │    │  │
│    │  └─────────────────────────────────────────────────────────────┘    │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
│                              │                                               │
│                              ▼                                               │
│                    systemctl enable nginx                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. CloudWatch Agent Setup                                                    │
│    ┌─────────────────────────────────────────────────────────────────────┐  │
│    │  Log Collection Config                                               │  │
│    │  ┌───────────────────────────────────────────────────────────────┐  │  │
│    │  │  /home/ec2-user/app/logs/combined.log ──▶ CloudWatch Logs    │  │  │
│    │  │  /home/ec2-user/app/logs/error.log    ──▶ CloudWatch Logs    │  │  │
│    │  │  /home/ec2-user/app/logs/output.log   ──▶ CloudWatch Logs    │  │  │
│    │  └───────────────────────────────────────────────────────────────┘  │  │
│    └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. Helper Scripts Creation                                                   │
│    ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐ │
│    │ ~/fetch-env.sh       │  │ ~/deploy.sh          │  │ ~/setup-ssl.sh  │ │
│    │                      │  │                      │  │                 │ │
│    │ SSM에서 환경변수     │  │ 앱 배포 스크립트     │  │ Certbot SSL    │ │
│    │ 가져와서 .env 생성   │  │ (pnpm, build, pm2)  │  │ 인증서 설정    │ │
│    └──────────────────────┘  └──────────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │   Ready for     │
                            │   Deployment!   │
                            └─────────────────┘
```

## Application Deployment Flow (deploy.sh)

사용자가 SSH 접속 후 `~/deploy.sh`를 실행하면:

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                           ~/deploy.sh Execution                                │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              │                              │
┌───────────────────┐                  │                              │
│ 1. Fetch Env Vars │                  │                              │
│    from SSM       │                  │                              │
│                   │                  │                              │
│ ~/fetch-env.sh    │                  │                              │
│    ▼              │                  │                              │
│ Creates .env file │                  │                              │
└───────────────────┘                  │                              │
                                       ▼                              │
                          ┌───────────────────────┐                   │
                          │ 2. pnpm install       │                   │
                          │    (dependencies)     │                   │
                          └───────────────────────┘                   │
                                       │                              │
                                       ▼                              │
                          ┌───────────────────────┐                   │
                          │ 3. pnpm build         │                   │
                          │    (TypeScript →      │                   │
                          │     JavaScript)       │                   │
                          └───────────────────────┘                   │
                                       │                              │
                                       ▼                              │
                          ┌───────────────────────┐                   │
                          │ 4. PM2 restart        │                   │
                          │    or start           │                   │
                          └───────────────────────┘                   │
                                       │                              │
                                       ▼                              │
┌───────────────────────────────────────────────────────────────────────────────┐
│                              Application Running                               │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         PM2 Process Manager                              │  │
│  │  ┌───────────────────────────────────────────────────────────────────┐  │  │
│  │  │ dangam-server (fork mode)                                          │  │  │
│  │  │   └─ dist/src/main.js                                             │  │  │
│  │  │   └─ Logs: ~/app/logs/{combined,error,output}.log                 │  │  │
│  │  └───────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                         │
│                                      ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                          pm2-logrotate                                   │  │
│  │   - Max size: 10MB                                                       │  │
│  │   - Retain: 7 files                                                      │  │
│  │   - Compress: enabled                                                    │  │
│  │   - Rotate: daily (0 0 * * *)                                           │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Complete Request Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Client Request                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  1. DNS Resolution                                                            │
│     api.growdangams.com ──▶ Route53 ──▶ Elastic IP (13.xxx.xxx.xxx)         │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  2. Security Group                                                            │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │ Inbound Rules:                                                       │  │
│     │   - Port 22 (SSH): 0.0.0.0/0                                        │  │
│     │   - Port 80 (HTTP): 0.0.0.0/0                                       │  │
│     │   - Port 443 (HTTPS): 0.0.0.0/0 ✓                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  3. Nginx (SSL Termination + Reverse Proxy)                                   │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │  HTTPS:443 ──▶ SSL Termination (Let's Encrypt)                      │  │
│     │      │                                                               │  │
│     │      ▼                                                               │  │
│     │  proxy_pass http://localhost:3000                                   │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  4. NestJS Application (PM2 managed)                                          │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │  Request ──▶ Controllers ──▶ Services ──▶ Response                  │  │
│     │                    │                                                 │  │
│     │                    ├──▶ MongoDB (via DB_URI)                        │  │
│     │                    ├──▶ Firebase (Push Notifications)               │  │
│     │                    ├──▶ Kakao API (Social Login)                    │  │
│     │                    └──▶ S3/CloudFront (File Storage/CDN)            │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  5. Logging & Monitoring                                                      │
│     ┌─────────────────────────────────────────────────────────────────────┐  │
│     │  PM2 Logs ──▶ CloudWatch Agent ──▶ CloudWatch Logs                  │  │
│     │                                          │                           │  │
│     │                                          ▼                           │  │
│     │                                   Metric Filter                      │  │
│     │                                   (ERROR count)                      │  │
│     │                                          │                           │  │
│     │                                          ▼                           │  │
│     │                              CloudWatch Alarm (> 5 errors/5min)     │  │
│     │                                          │                           │  │
│     │                                          ▼                           │  │
│     │                                    SNS ──▶ Email Alert              │  │
│     └─────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Estimated Monthly Cost

| Resource | Cost |
|----------|------|
| EC2 t3.micro | ~$8.5 (Free tier: $0) |
| Elastic IP | $0 (attached to running EC2) |
| Route53 Hosted Zone | $0.5 |
| SSM Parameter Store | $0 (Standard tier) |
| CloudWatch Logs | ~$0.50 (14-day retention) |
| CloudFront | ~$0 (minimal traffic) |
| SNS | $0 (first 1M requests) |
| **Total** | **~$9.5/month** (Free tier: ~$1/month) |

## Prerequisites

### 1. AWS CLI Setup
```bash
aws configure
# AWS Access Key ID, Secret Access Key, Region (ap-northeast-2)
```

### 2. Install Terraform
```bash
# macOS
brew install terraform

# Verify
terraform version
```

### 3. Create SSH Key Pair
```bash
aws ec2 create-key-pair \
  --key-name dangam-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/dangam-key.pem

chmod 400 ~/.ssh/dangam-key.pem
```

## Deployment

### 1. Create Variables File
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with actual values
```

### 2. Terraform Init & Apply
```bash
# Initialize
terraform init

# Preview changes
terraform plan

# Deploy
terraform apply
```

### 3. Deploy Application
```bash
# SSH into EC2
ssh -i ~/.ssh/dangam-key.pem ec2-user@<ELASTIC_IP>

# Clone repository
git clone git@github.com:imcool2551/dangam-server.git /home/ec2-user/app

# Deploy
~/deploy.sh
```

### 4. Setup SSL Certificate
```bash
# Wait for DNS propagation (5-10 min)
nslookup api.growdangams.com

# Setup SSL
~/setup-ssl.sh
```

## Common Commands

### Terraform
```bash
terraform plan          # Preview changes
terraform apply         # Deploy
terraform destroy       # Destroy all resources
terraform output        # Show outputs
```

### EC2 Access
```bash
# SSH
ssh -i ~/.ssh/dangam-key.pem ec2-user@<ELASTIC_IP>

# SSM Session Manager (no SSH key required)
aws ssm start-session --target <INSTANCE_ID>
```

### Application Management
```bash
# PM2 status
pm2 status

# View logs
pm2 logs

# Restart application
pm2 restart dangam-server

# Refresh environment variables
~/fetch-env.sh dangam-server prod ap-northeast-2
pm2 restart dangam-server
```

## Updating Environment Variables

### Via AWS Console
1. Systems Manager → Parameter Store
2. Modify parameters under `/dangam-server/prod/`
3. Refresh on EC2:
   ```bash
   ~/fetch-env.sh dangam-server prod ap-northeast-2
   pm2 restart dangam-server
   ```

### Via Terraform
1. Edit `terraform.tfvars`
2. Run `terraform apply`
3. Refresh on EC2

## Troubleshooting

### Check User Data Log
```bash
cat /var/log/user-data.log
```

### Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### CloudWatch Agent Status
```bash
sudo systemctl status amazon-cloudwatch-agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status
```

### SSL Certificate Renewal
```bash
sudo certbot renew --dry-run
```

### PM2 Logs
```bash
pm2 logs dangam-server --lines 100
tail -f ~/app/logs/error.log
```
