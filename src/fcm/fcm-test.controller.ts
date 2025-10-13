import { Body, Controller, Post } from '@nestjs/common';
import { FcmTestService } from './fcm-test.service';
import { PublicApi } from '../auth/decorators/role.decorator';

class CreateTestDiaryDto {
  groupId: string;
  authorAccountId: string;
}

class CreateTestCommentDto {
  diaryId: string;
  authorAccountId: string;
  parentCommentId?: string;
}

@Controller('fcm/test')
export class FcmTestController {
  constructor(private readonly fcmTestService: FcmTestService) {}

  @Post('create-diary')
  @PublicApi()
  async createTestDiary(@Body() dto: CreateTestDiaryDto) {
    return this.fcmTestService.createTestDiary(dto.groupId, dto.authorAccountId);
  }

  @Post('create-comment')
  @PublicApi()
  async createTestComment(@Body() dto: CreateTestCommentDto) {
    return this.fcmTestService.createTestComment(
      dto.diaryId,
      dto.authorAccountId,
      dto.parentCommentId,
    );
  }
}
