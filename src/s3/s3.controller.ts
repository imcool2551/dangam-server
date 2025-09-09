import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { S3Service } from './s3.service';
import { GenerateUploadUrlDto } from './dto/s3.dto';
import { AccountRolesType } from '../auth/interfaces/auth.interface';
import { Role } from '../auth/decorators/role.decorator';
import { validateS3Key } from './utils/key';

@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post('groups/thumbnails/upload-url')
  async generateGroupThumbnailUploadUrl(
    @Body() dto: GenerateUploadUrlDto,
  ): Promise<{ uploadUrl: string; key: string }> {
    return await this.s3Service.generateGroupThumbnailUploadUrl(
      dto.fileExtension,
    );
  }

  @Post('groups/:group/upload-url')
  @Role(AccountRolesType.member)
  async generateUploadUrl(
    @Param('group') groupId: string,
    @Body() dto: GenerateUploadUrlDto,
  ): Promise<{ uploadUrl: string; key: string }> {
    return await this.s3Service.generateUploadUrl(groupId, dto.fileExtension);
  }

  @Get('groups/:group/download-url')
  @Role(AccountRolesType.member)
  async generateDownloadUrl(
    @Param('group') groupId: string,
    @Query('key') key: string,
  ): Promise<{ downloadUrl: string }> {
    if (!validateS3Key(key, groupId)) {
      throw new BadRequestException('Invalid key format or group mismatch');
    }

    const downloadUrl = await this.s3Service.generateDownloadUrl(key);
    return { downloadUrl };
  }
}
