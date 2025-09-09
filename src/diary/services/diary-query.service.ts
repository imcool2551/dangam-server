import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { Model } from 'mongoose';
import {
  DiaryListResponse,
  DiaryResponse,
  ListDiaryDto,
} from '../dto/diary.dto';
import { nextCursorOf, parseCursorOf } from '../../util.mongo';
import { transformDiaryDocumentToResponse } from '../utils/diary-transformer';

@Injectable()
export class DiaryQueryService {
  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
  ) {}

  async findOne(group: string, diaryId: string): Promise<DiaryResponse> {
    const diary = await this.diaryModel
      .findOne({ _id: diaryId, group: group, deleted: false })
      .exec();

    if (!diary) {
      throw new BadRequestException('Diary not found');
    }

    return transformDiaryDocumentToResponse(diary);
  }

  async list(group: string, dto: ListDiaryDto): Promise<DiaryListResponse> {
    const limit = dto.limit || 20;
    const query: any = { group, deleted: false };

    // Add cursor filter if provided
    const cursorFilter = parseCursorOf('createdAt', dto.next);
    if (cursorFilter) {
      Object.assign(query, cursorFilter);
    }

    // Find diaries with limit + 1 to check if there are more
    let diaries = await this.diaryModel
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .exec();

    // Check if there are more items
    const hasMore = diaries.length > limit;
    diaries = hasMore ? diaries.slice(0, limit) : diaries;

    // Generate response
    const items = diaries.map(transformDiaryDocumentToResponse);

    return {
      items: items,
      next: hasMore ? nextCursorOf(items, '_id', 'createdAt') : undefined,
    };
  }
}