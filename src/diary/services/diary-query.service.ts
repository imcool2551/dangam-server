import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { Model } from 'mongoose';
import { DiaryResponse } from '../dto/diary.dto';

@Injectable()
export class DiaryQueryService {
  private readonly logger = new Logger(DiaryQueryService.name);

  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
  ) {}

  async findOne(
    group: string,
    diaryId: string,
  ): Promise<DiaryResponse> {
    const diary = await this.diaryModel
      .findOne({ _id: diaryId, group: group, deleted: false })
      .exec();

    if (!diary) {
      throw new BadRequestException('Diary not found');
    }

    return {
      _id: diary._id,
    };
  }
}