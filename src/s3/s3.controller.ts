import { Controller, Post, Body, Get, Query, UseGuards, Param, BadRequestException } from '@nestjs/common';
import { S3Service } from './s3.service';
import { GenerateUploadUrlDto, GenerateDownloadUrlDto } from './dto/s3.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Auth } from '../auth/decorators/auth.decorator';
import { AuthPayload, AccountRolesType } from '../auth/interfaces/auth.interface';
import { Role } from '../auth/decorators/role.decorator';
import { validateS3Key } from './utils/key';

@Controller('s3')
@UseGuards(AuthGuard)
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Post('groups/:group/upload-url')
  @Role(AccountRolesType.member)
  async generateUploadUrl(
    @Auth() auth: AuthPayload,
    @Param('group') groupId: string,
    @Body() dto: GenerateUploadUrlDto,
  ): Promise<{ uploadUrl: string; key: string }> {
    return await this.s3Service.generateUploadUrl(groupId, dto.fileExtension);
  }

  @Get('groups/:group/download-url')
  @Role(AccountRolesType.member)
  async generateDownloadUrl(
    @Auth() auth: AuthPayload,
    @Param('group') groupId: string,
    @Query() dto: GenerateDownloadUrlDto,
  ): Promise<{ downloadUrl: string }> {
    if (!validateS3Key(dto.key, groupId)) {
      throw new BadRequestException('Invalid key format or group mismatch');
    }

    const downloadUrl = await this.s3Service.generateDownloadUrl(dto.key);
    return { downloadUrl };
  }
}