import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Auth } from '../../auth/decorators/auth.decorator';
import { Role } from '../../auth/decorators/role.decorator';
import { AccountRolesType, AuthPayload } from '../../auth/interfaces/auth.interface';
import {
  CommentResponse,
  CreateCommentDto,
  UpdateCommentDto,
} from '../dto/diary-comment.dto';
import { DiaryCommentService } from '../services/diary-comment.service';

@Controller('diary')
export class DiaryCommentController {
  constructor(private readonly diaryCommentService: DiaryCommentService) {}

  @Post('/:group/:diary/comments')
  @Role(AccountRolesType.member)
  createComment(
    @Auth() auth: AuthPayload,
    @Param('diary') diary: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    return this.diaryCommentService.createComment(auth, diary, dto);
  }

  @Get('/:group/:diary/comments')
  @Role(AccountRolesType.member)
  getComments(
    @Param('diary') diary: string,
  ): Promise<CommentResponse[]> {
    return this.diaryCommentService.getComments(diary);
  }

  @Put('/:group/comments/:comment')
  @Role(AccountRolesType.member)
  updateComment(
    @Auth() auth: AuthPayload,
    @Param('comment') comment: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponse> {
    return this.diaryCommentService.updateComment(auth, comment, dto);
  }

  @Delete('/:group/comments/:comment')
  @Role(AccountRolesType.member)
  deleteComment(
    @Auth() auth: AuthPayload,
    @Param('comment') comment: string,
  ) {
    return this.diaryCommentService.deleteComment(auth, comment);
  }
}