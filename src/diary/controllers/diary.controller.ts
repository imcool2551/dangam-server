import { Body, Controller, Param, Post } from '@nestjs/common';
import { Role } from '../../auth/decorators/role.decorator';
import {
  AccountRolesType,
  AuthPayload,
} from '../../auth/interfaces/auth.interface';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateDiaryDto, DiaryResponse } from '../dto/diary.dto';
import { DiaryService } from '../services/diary.service';

@Controller('diary')
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  @Post('/:group')
  @Role(AccountRolesType.member)
  create(
    @Auth() auth: AuthPayload,
    @Param('group') group: string,
    @Body() dto: CreateDiaryDto,
  ): Promise<DiaryResponse> {
    return this.diaryService.create(auth, group, dto);
  }
}
