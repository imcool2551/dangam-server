import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DiaryLike, DiaryLikeDocument } from '../schema/diary-like.schema';
import { AuthPayload } from '../../auth/interfaces/auth.interface';
import { LikeToggleResponse } from '../dto/like.dto';

@Injectable()
export class DiaryLikeService {
  constructor(
    @InjectModel(DiaryLike.name)
    private readonly diaryLikeModel: Model<DiaryLikeDocument>,
  ) {}

  async toggleLike(auth: AuthPayload, diaryId: string): Promise<LikeToggleResponse> {
    const existingLike = await this.diaryLikeModel.findOne({
      account: auth.uid,
      diary: diaryId,
    });

    if (existingLike) {
      // Remove like
      await this.diaryLikeModel.deleteOne({ _id: existingLike._id });
      const likeCount = await this.diaryLikeModel.countDocuments({ diary: diaryId });
      return { liked: false, likeCount };
    } else {
      // Add like
      await this.diaryLikeModel.create({
        account: auth.uid,
        diary: diaryId,
      });
      const likeCount = await this.diaryLikeModel.countDocuments({ diary: diaryId });
      return { liked: true, likeCount };
    }
  }

  async getLikeStatus(accountId: string, diaryId: string): Promise<{ liked: boolean; likeCount: number }> {
    const [liked, likeCount] = await Promise.all([
      this.diaryLikeModel.exists({ account: accountId, diary: diaryId }),
      this.diaryLikeModel.countDocuments({ diary: diaryId }),
    ]);

    return {
      liked: !!liked,
      likeCount,
    };
  }

  async getLikeInfoForDiaries(
    accountId: string,
    diaryIds: string[],
  ): Promise<Map<string, { liked: boolean; likeCount: number }>> {
    if (diaryIds.length === 0) {
      return new Map();
    }

    // Get all likes for the given diaries
    const [userLikes, likeCounts] = await Promise.all([
      this.diaryLikeModel.find({
        account: accountId,
        diary: { $in: diaryIds },
      }).select('diary').lean(),
      this.diaryLikeModel.aggregate([
        { $match: { diary: { $in: diaryIds } } },
        { $group: { _id: '$diary', count: { $sum: 1 } } },
      ]),
    ]);

    // Build user likes set
    const userLikedDiaries = new Set(userLikes.map((like) => like.diary));

    // Build like count map
    const likeCountMap = new Map<string, number>();
    for (const item of likeCounts) {
      likeCountMap.set(item._id, item.count);
    }

    // Build result map
    const result = new Map<string, { liked: boolean; likeCount: number }>();
    for (const diaryId of diaryIds) {
      result.set(diaryId, {
        liked: userLikedDiaries.has(diaryId),
        likeCount: likeCountMap.get(diaryId) || 0,
      });
    }

    return result;
  }
}
