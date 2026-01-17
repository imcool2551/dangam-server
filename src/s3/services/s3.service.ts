import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateS3Key, generateGroupThumbnailKey } from '../utils/key';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly cloudfrontDomain: string | undefined;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'ap-northeast-2'),
      // credentials 자동 탐지: 환경변수 → ~/.aws/credentials → EC2 IAM Role
    });
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.cloudfrontDomain = this.configService.get<string>('CLOUDFRONT_DOMAIN');
  }

  async generateUploadUrl(groupId: string, fileExtension: string): Promise<{ uploadUrl: string; key: string }> {
    const key = generateS3Key(groupId, fileExtension);
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: `image/${fileExtension}`,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    return { uploadUrl, key };
  }

  async generateGroupThumbnailUploadUrl(fileExtension: string): Promise<{ uploadUrl: string; key: string }> {
    const key = generateGroupThumbnailKey(fileExtension);
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: `image/${fileExtension}`,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

    return { uploadUrl, key };
  }

  async generateDownloadUrl(key: string): Promise<string> {
    // CloudFront 설정 시 CloudFront URL 반환
    if (this.cloudfrontDomain) {
      return `https://${this.cloudfrontDomain}/${key}`;
    }

    // Fallback: S3 Signed URL
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }
}