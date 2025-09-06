import { Module } from '@nestjs/common';
import { DiaryController } from './controllers/diary.controller';
import { Diary, DiarySchema } from './schema/diary.schema';
import { DiaryService } from './services/diary.service';
import { DiaryImageProcessingService } from './services/diary-image-processing.service';
import { ImageTranscodingService } from './services/image-transcoding.service';
import { MongooseModule } from '@nestjs/mongoose';

const DiaryMongooseModule = MongooseModule.forFeature([
  {
    name: Diary.name,
    schema: DiarySchema,
  },
]);

@Module({
  imports: [DiaryMongooseModule],
  controllers: [DiaryController],
  providers: [DiaryService, DiaryImageProcessingService, ImageTranscodingService],
  exports: [DiaryMongooseModule],
})
export class DiaryModule {}
