import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommentLike, CommentLikeDocument } from '../schema/comment-like.schema';
import { AuthPayload } from '../../auth/interfaces/auth.interface';
import { LikeToggleResponse } from '../dto/like.dto';

@Injectable()
export class CommentLikeService {
  constructor(
    @InjectModel(CommentLike.name)
    private readonly commentLikeModel: Model<CommentLikeDocument>,
  ) {}

  async toggleLike(auth: AuthPayload, commentId: string): Promise<LikeToggleResponse> {
    const existingLike = await this.commentLikeModel.findOne({
      account: auth.uid,
      comment: commentId,
    });

    if (existingLike) {
      // Remove like
      await this.commentLikeModel.deleteOne({ _id: existingLike._id });
      const likeCount = await this.commentLikeModel.countDocuments({ comment: commentId });
      return { liked: false, likeCount };
    } else {
      // Add like
      await this.commentLikeModel.create({
        account: auth.uid,
        comment: commentId,
      });
      const likeCount = await this.commentLikeModel.countDocuments({ comment: commentId });
      return { liked: true, likeCount };
    }
  }

  async getLikeInfoForComments(
    accountId: string,
    commentIds: string[],
  ): Promise<Map<string, { liked: boolean; likeCount: number }>> {
    if (commentIds.length === 0) {
      return new Map();
    }

    // Get all likes for the given comments
    const [userLikes, likeCounts] = await Promise.all([
      this.commentLikeModel.find({
        account: accountId,
        comment: { $in: commentIds },
      }).select('comment').lean(),
      this.commentLikeModel.aggregate([
        { $match: { comment: { $in: commentIds } } },
        { $group: { _id: '$comment', count: { $sum: 1 } } },
      ]),
    ]);

    // Build user likes set
    const userLikedComments = new Set(userLikes.map((like) => like.comment));

    // Build like count map
    const likeCountMap = new Map<string, number>();
    for (const item of likeCounts) {
      likeCountMap.set(item._id, item.count);
    }

    // Build result map
    const result = new Map<string, { liked: boolean; likeCount: number }>();
    for (const commentId of commentIds) {
      result.set(commentId, {
        liked: userLikedComments.has(commentId),
        likeCount: likeCountMap.get(commentId) || 0,
      });
    }

    return result;
  }
}
