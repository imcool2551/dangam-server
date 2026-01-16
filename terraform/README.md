# Dangam Server - Terraform 배포

## 아키텍처

```
Route53 (api.growdangams.com)
    ↓ A Record
Elastic IP
    ↓
EC2 (t3.micro)
├── Nginx (리버스 프록시 + SSL)
├── PM2 (프로세스 매니저)
└── NestJS App (포트 3000)
    ↓
SSM Parameter Store (환경변수)
```

## 예상 비용 (월)

| 리소스 | 비용 |
|--------|------|
| EC2 t3.micro | ~$8.5 (Free tier면 무료) |
| EIP | $0 (EC2 연결 시) |
| Route53 Hosted Zone | $0.5 |
| SSM Parameter Store | $0 (Standard) |
| **총합** | **~$9/월** (Free tier: ~$0.5/월) |

## 사전 준비

### 1. AWS CLI 설정
```bash
aws configure
# AWS Access Key ID, Secret Access Key, Region(ap-northeast-2) 입력
```

### 2. Terraform 설치
```bash
# macOS
brew install terraform

# 확인
terraform version
```

### 3. SSH 키 페어 생성
```bash
# AWS에서 키 페어 생성
aws ec2 create-key-pair \
  --key-name dangam-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/dangam-key.pem

chmod 400 ~/.ssh/dangam-key.pem
```

## 배포 방법

### 1. 변수 파일 생성
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars 파일을 열어 실제 값 입력
```

### 2. Terraform 초기화 및 배포
```bash
# 초기화
terraform init

# 계획 확인
terraform plan

# 배포
terraform apply
```

### 3. 애플리케이션 배포
```bash
# SSH 접속 (terraform output에서 명령어 확인)
ssh -i ~/.ssh/dangam-key.pem ec2-user@<ELASTIC_IP>

# 애플리케이션 코드 클론
cd /home/ec2-user/app
git clone https://github.com/your-repo/dangam-server.git .

# 배포 실행
./deploy.sh
```

### 4. SSL 인증서 설정
```bash
# DNS 전파 확인 (5-10분 소요)
nslookup api.growdangams.com

# SSL 설정
./setup-ssl.sh
```

## 주요 명령어

### Terraform
```bash
terraform plan          # 변경사항 미리보기
terraform apply         # 배포
terraform destroy       # 전체 삭제
terraform output        # 출력값 확인
```

### EC2 접속
```bash
# SSH
ssh -i ~/.ssh/dangam-key.pem ec2-user@<ELASTIC_IP>

# SSM Session Manager (SSH 키 없이)
aws ssm start-session --target <INSTANCE_ID>
```

### 애플리케이션 관리
```bash
# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 재시작
pm2 restart dangam-server

# 환경변수 다시 가져오기
./fetch-env.sh dangam-server prod ap-northeast-2
```

## 환경변수 수정

### AWS 콘솔에서
1. Systems Manager → Parameter Store
2. `/dangam-server/prod/` 경로의 파라미터 수정
3. EC2에서 환경변수 다시 가져오기:
   ```bash
   ./fetch-env.sh dangam-server prod ap-northeast-2
   pm2 restart dangam-server
   ```

### Terraform으로
1. `terraform.tfvars` 수정
2. `terraform apply`
3. EC2에서 환경변수 다시 가져오기

## 트러블슈팅

### User Data 로그 확인
```bash
cat /var/log/user-data.log
```

### Nginx 상태 확인
```bash
sudo systemctl status nginx
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### SSL 인증서 갱신
```bash
sudo certbot renew --dry-run
```
