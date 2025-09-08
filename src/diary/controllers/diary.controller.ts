import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Role } from '../../auth/decorators/role.decorator';
import {
  AccountRolesType,
  AuthPayload,
} from '../../auth/interfaces/auth.interface';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateDiaryDto, UpdateDiaryDto, DiaryResponse } from '../dto/diary.dto';
import { DiaryService } from '../services/diary.service';
import { DiaryQueryService } from '../services/diary-query.service';

@Controller('diary')
export class DiaryController {
  constructor(
    private readonly diaryService: DiaryService,
    private readonly diaryQueryService: DiaryQueryService,
  ) {}

  @Post('/:group')
  @Role(AccountRolesType.member)
  create(
    @Auth() auth: AuthPayload,
    @Param('group') group: string,
    @Body() dto: CreateDiaryDto,
  ): Promise<DiaryResponse> {
    return this.diaryService.create(auth, group, dto);
  }

  @Put('/:group/:diary')
  @Role(AccountRolesType.member)
  update(
    @Auth() auth: AuthPayload,
    @Param('group') group: string,
    @Param('diary') diary: string,
    @Body() dto: UpdateDiaryDto,
  ): Promise<DiaryResponse> {
    return this.diaryService.update(auth, group, diary, dto);
  }

  @Get('/:group/:diary')
  @Role(AccountRolesType.member)
  findOne(
    @Param('group') group: string,
    @Param('diary') diary: string,
  ): Promise<DiaryResponse> {
    return this.diaryQueryService.findOne(group, diary);
  }

  @Delete('/:group/:diary')
  @Role(AccountRolesType.member)
  delete(
    @Auth() auth: AuthPayload,
    @Param('group') group: string,
    @Param('diary') diary: string,
  ): Promise<DiaryResponse> {
    return this.diaryService.delete(auth, group, diary);
  }
}
