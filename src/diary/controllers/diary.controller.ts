import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Role } from '../../auth/decorators/role.decorator';
import {
  AccountRolesType,
  AuthPayload,
} from '../../auth/interfaces/auth.interface';
import { Auth } from '../../auth/decorators/auth.decorator';
import { CreateDiaryDto, UpdateDiaryDto, DiaryResponse, ListDiaryDto, DiaryListResponse } from '../dto/diary.dto';
import { DiaryService } from '../services/diary.service';
import { DiaryQueryService } from '../services/diary-query.service';
import { DiaryLikeService } from '../services/diary-like.service';
import { LikeToggleResponse } from '../dto/like.dto';

@Controller('diary')
export class DiaryController {
  constructor(
    private readonly diaryService: DiaryService,
    private readonly diaryQueryService: DiaryQueryService,
    private readonly diaryLikeService: DiaryLikeService,
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

  @Get('/:group')
  @Role(AccountRolesType.member)
  list(
    @Auth() auth: AuthPayload,
    @Param('group') group: string,
    @Query() dto: ListDiaryDto,
  ): Promise<DiaryListResponse> {
    return this.diaryQueryService.list(auth, group, dto);
  }

  @Get('/:group/:diary')
  @Role(AccountRolesType.member)
  findOne(
    @Auth() auth: AuthPayload,
    @Param('group') group: string,
    @Param('diary') diary: string,
  ): Promise<DiaryResponse> {
    return this.diaryQueryService.findOne(auth, group, diary);
  }

  @Post('/:group/:diary/like')
  @Role(AccountRolesType.member)
  toggleLike(
    @Auth() auth: AuthPayload,
    @Param('diary') diary: string,
  ): Promise<LikeToggleResponse> {
    return this.diaryLikeService.toggleLike(auth, diary);
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
