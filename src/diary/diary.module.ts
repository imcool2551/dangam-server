import { Module } from '@nestjs/common';
import { DiaryController } from './controllers/diary.controller';
import { Diary, DiarySchema } from './schema/diary.schema';
import { DiaryService } from './services/diary.service';
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
  providers: [DiaryService],
  exports: [DiaryMongooseModule],
})
export class DiaryModule {}
