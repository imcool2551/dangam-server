import { Module } from '@nestjs/common';
import { DiaryController } from './controllers/diary.controller';
import { Diary, DiarySchema } from './schema/diary.schema';
import { DiaryService } from './services/diary.service';
import { DiaryImageProcessor } from './components/diary-image-processor';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountModule } from '../account/account.module';
import { FcmModule } from '../fcm/fcm.module';
import { DiaryQueryService } from './services/diary-query.service';
import { GroupModule } from '../group/group.module';
import { ImageModule } from '../image/image.module';

const DiaryMongooseModule = MongooseModule.forFeature([
  {
    name: Diary.name,
    schema: DiarySchema,
  },
]);

@Module({
  imports: [DiaryMongooseModule, AccountModule, GroupModule, FcmModule, ImageModule],
  controllers: [DiaryController],
  providers: [DiaryService, DiaryQueryService, DiaryImageProcessor],
  exports: [DiaryMongooseModule],
})
export class DiaryModule {}
