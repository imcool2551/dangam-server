import { Module } from '@nestjs/common';
import { DiaryController } from './controllers/diary.controller';
import { DiaryCommentController } from './controllers/diary-comment.controller';
import { Diary, DiarySchema } from './schema/diary.schema';
import {
  DiaryComment,
  DiaryCommentSchema,
} from './schema/diary-comment.schema';
import { DiaryLike, DiaryLikeSchema } from './schema/diary-like.schema';
import { CommentLike, CommentLikeSchema } from './schema/comment-like.schema';
import { DiaryService } from './services/diary.service';
import { DiaryCommentService } from './services/diary-comment.service';
import { DiaryLikeService } from './services/diary-like.service';
import { CommentLikeService } from './services/comment-like.service';
import { DiaryImageProcessor } from './components/diary-image-processor';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountModule } from '../account/account.module';
import { FcmModule } from '../fcm/fcm.module';
import { DiaryQueryService } from './services/diary-query.service';
import { GroupModule } from '../group/group.module';
import { ImageModule } from '../image/image.module';
import { S3Module } from '../s3/s3.module';

const DiaryMongooseModule = MongooseModule.forFeature([
  {
    name: Diary.name,
    schema: DiarySchema,
  },
  {
    name: DiaryComment.name,
    schema: DiaryCommentSchema,
  },
  {
    name: DiaryLike.name,
    schema: DiaryLikeSchema,
  },
  {
    name: CommentLike.name,
    schema: CommentLikeSchema,
  },
]);

@Module({
  imports: [
    DiaryMongooseModule,
    AccountModule,
    GroupModule,
    FcmModule,
    ImageModule,
    S3Module,
  ],
  controllers: [DiaryController, DiaryCommentController],
  providers: [
    DiaryService,
    DiaryCommentService,
    DiaryQueryService,
    DiaryLikeService,
    CommentLikeService,
    DiaryImageProcessor,
  ],
  exports: [DiaryMongooseModule],
})
export class DiaryModule {}
