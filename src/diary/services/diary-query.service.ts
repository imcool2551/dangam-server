import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { DiaryComment, DiaryCommentDocument } from '../schema/diary-comment.schema';
import { Model } from 'mongoose';
import {
  DiaryListResponse,
  DiaryResponse,
  ListDiaryDto,
} from '../dto/diary.dto';
import { nextCursorOf, parseCursorOf } from '../../util.mongo';
import { toDiaryResponse, PopulatedDiaryDocument } from '../utils/diary-transformer';
import { DiaryLikeService } from './diary-like.service';
import { AuthPayload } from '../../auth/interfaces/auth.interface';

@Injectable()
export class DiaryQueryService {
  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
    @InjectModel(DiaryComment.name) private readonly diaryCommentModel: Model<DiaryCommentDocument>,
    private readonly diaryLikeService: DiaryLikeService,
  ) {}

  async findOne(auth: AuthPayload, group: string, diaryId: string): Promise<DiaryResponse> {
    const diary = await this.diaryModel
      .findOne({ _id: diaryId, group: group, deleted: false })
      .populate('account', 'displayName')
      .exec() as PopulatedDiaryDocument | null;

    if (!diary) {
      throw new BadRequestException('Diary not found');
    }

    const [likeInfo, commentCount] = await Promise.all([
      this.diaryLikeService.getLikeStatus(auth.uid, diaryId),
      this.diaryCommentModel.countDocuments({ diary: diaryId, deleted: false }),
    ]);

    return toDiaryResponse(diary, { ...likeInfo, commentCount });
  }

  async list(auth: AuthPayload, group: string, dto: ListDiaryDto): Promise<DiaryListResponse> {
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
      .populate('account', 'displayName')
      .exec() as PopulatedDiaryDocument[];

    // Check if there are more items
    const hasMore = diaries.length > limit;
    diaries = hasMore ? diaries.slice(0, limit) : diaries;

    // Get like info and comment counts for all diaries
    const diaryIds = diaries.map((d) => d._id);
    const [likeInfoMap, commentCounts] = await Promise.all([
      this.diaryLikeService.getLikeInfoForDiaries(auth.uid, diaryIds),
      this.getCommentCountsForDiaries(diaryIds),
    ]);

    // Generate response
    const items = diaries.map((diary) => {
      const likeInfo = likeInfoMap.get(diary._id) || { liked: false, likeCount: 0 };
      const commentCount = commentCounts.get(diary._id) || 0;
      return toDiaryResponse(diary, { ...likeInfo, commentCount });
    });

    return {
      items: items,
      next: hasMore ? nextCursorOf(items, '_id', 'createdAt') : undefined,
    };
  }

  private async getCommentCountsForDiaries(diaryIds: string[]): Promise<Map<string, number>> {
    if (diaryIds.length === 0) {
      return new Map();
    }

    const counts = await this.diaryCommentModel.aggregate([
      { $match: { diary: { $in: diaryIds }, deleted: false } },
      { $group: { _id: '$diary', count: { $sum: 1 } } },
    ]);

    const result = new Map<string, number>();
    for (const item of counts) {
      result.set(item._id, item.count);
    }

    return result;
  }
}