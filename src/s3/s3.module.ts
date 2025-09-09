import { Module } from '@nestjs/common';
import { S3Service } from './services/s3.service';
import { S3Controller } from './s3.controller';
import { S3ImageService } from './services/s3-image.service';
import { ImageModule } from '../image/image.module';

@Module({
  imports: [ImageModule],
  controllers: [S3Controller],
  providers: [S3Service, S3ImageService],
  exports: [S3Service, S3ImageService],
})
export class S3Module {}