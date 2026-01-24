import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DiaryComment,
  DiaryCommentDocument,
} from '../schema/diary-comment.schema';
import {
  CommentResponse,
  CreateCommentDto,
  UpdateCommentDto,
} from '../dto/diary-comment.dto';
import {
  AccountRolesType,
  AuthPayload,
} from '../../auth/interfaces/auth.interface';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { FcmService } from '../../fcm/fcm.service';
import { Account, AccountDocument } from '../../account/schema/account.schema';
import { Group, GroupDocument } from '../../group/schemas/group.schema';
import { CommentLikeService } from './comment-like.service';

@Injectable()
export class DiaryCommentService {
  private readonly logger = new Logger(DiaryCommentService.name);

  constructor(
    @InjectModel(DiaryComment.name)
    private readonly diaryCommentModel: Model<DiaryCommentDocument>,
    @InjectModel(Diary.name)
    private readonly diaryModel: Model<DiaryDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
    private readonly fcmService: FcmService,
    private readonly commentLikeService: CommentLikeService,
  ) {}

  async createComment(
    auth: AuthPayload,
    diary: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    // Validate parent comment exists if provided
    if (dto.parentComment) {
      const parentComment = await this.diaryCommentModel.findOne({
        _id: dto.parentComment,
        diary: diary,
        deleted: false,
      });

      if (!parentComment) {
        throw new BadRequestException('Parent comment not found');
      }
    }

    const comment = await this.diaryCommentModel.create({
      diary: diary,
      account: auth.uid,
      content: dto.content,
      parentComment: dto.parentComment,
    });

    // Send FCM notification (fire and forget)
    this.sendCommentNotification(auth.uid, diary, comment._id, dto.parentComment).catch((err) => {
      this.logger.error('Error sending comment notification:', err);
    });

    return this.buildCommentResponse(comment);
  }

  async getComments(auth: AuthPayload, diary: string): Promise<CommentResponse[]> {
    const comments = await this.diaryCommentModel.aggregate([
      {
        $match: {
          diary: diary,
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'author',
        },
      },
      { $unwind: '$author' },
      {
        $sort: {
          createdAt: 1,
        },
      },
    ]);

    // Get like info for all comments
    const commentIds = comments.map((c) => c._id);
    const likeInfoMap = await this.commentLikeService.getLikeInfoForComments(auth.uid, commentIds);

    // Build hierarchical structure
    const commentMap = new Map<string, CommentResponse>();
    const rootComments: CommentResponse[] = [];

    // First pass: create all comment objects
    for (const comment of comments) {
      const likeInfo = likeInfoMap.get(comment._id) || { liked: false, likeCount: 0 };
      const commentResponse: CommentResponse = {
        _id: comment._id,
        diary: comment.diary,
        content: comment.content,
        parentComment: comment.parentComment,
        author: {
          uid: comment.author._id,
          displayName: comment.author.displayName,
        },
        deleted: comment.deleted || false,
        likeCount: likeInfo.likeCount,
        liked: likeInfo.liked,
        createdAt: comment.createdAt.getTime(),
        updatedAt: comment.updatedAt.getTime(),
        replies: [],
      };

      commentMap.set(comment._id, commentResponse);

      if (!comment.parentComment) {
        rootComments.push(commentResponse);
      }
    }

    // Second pass: attach replies to their parents
    for (const comment of comments) {
      if (comment.parentComment) {
        const parentComment = commentMap.get(comment.parentComment);
        const childComment = commentMap.get(comment._id);
        if (parentComment && childComment) {
          parentComment.replies.push(childComment);
        }
      }
    }

    return rootComments;
  }

  async updateComment(
    auth: AuthPayload,
    comment: string,
    dto: UpdateCommentDto,
  ): Promise<CommentResponse> {
    const commentDoc = await this.diaryCommentModel.findOne({
      _id: comment,
      account: auth.uid,
      deleted: false,
    });

    if (!commentDoc) {
      throw new BadRequestException('Comment not found or access denied');
    }

    commentDoc.content = dto.content;
    await commentDoc.save();

    return this.buildCommentResponse(commentDoc);
  }

  async deleteComment(auth: AuthPayload, comment: string) {
    const commentDoc = await this.diaryCommentModel
      .findOne({
        _id: comment,
        deleted: false,
      })
      .populate('diary');

    if (!commentDoc) {
      throw new BadRequestException('Comment not found');
    }

    // Get group from diary to check permissions
    const diary = commentDoc.diary as unknown as DiaryDocument;
    const group = diary.group;
    const userGroupRole = auth.acl[group];
    const isAuthor = commentDoc.account === auth.uid;
    const isEditor = userGroupRole >= AccountRolesType.editor;

    if (!isAuthor && !isEditor) {
      throw new BadRequestException(
        'You can only delete your own comments or need editor permissions',
      );
    }

    commentDoc.deleted = true;
    await commentDoc.save();

    return { message: 'Comment deleted successfully' };
  }

  private async sendCommentNotification(
    authorUid: string,
    diaryId: string,
    commentId: string,
    parentCommentId?: string,
  ): Promise<void> {
    try {
      // Get diary with group info
      const diaryDoc = await this.diaryModel.findById(diaryId).exec();

      if (!diaryDoc) {
        this.logger.warn('Diary not found for comment notification');
        return;
      }

      // Get comment author info
      const commentAuthor = await this.accountModel.findById(authorUid).exec();
      if (!commentAuthor) {
        this.logger.warn('Comment author not found');
        return;
      }

      const commentAuthorName = commentAuthor.displayName;

      // Get group info
      const groupDoc = await this.groupModel.findById(diaryDoc.group).exec();
      if (!groupDoc) {
        this.logger.warn('Group not found for comment notification');
        return;
      }

      const notifications: Array<{
        token: string;
        title: string;
        body: string;
        data: Record<string, string>;
      }> = [];

      // Case 1: Reply to a comment (대댓글)
      if (parentCommentId) {
        const parentComment = await this.diaryCommentModel
          .findById(parentCommentId)
          .exec();

        if (parentComment) {
          const parentCommentAuthor = await this.accountModel
            .findById(parentComment.account)
            .exec();

          // Send notification to parent comment author (자기 자신 제외)
          if (
            parentCommentAuthor &&
            parentCommentAuthor._id !== authorUid &&
            parentCommentAuthor.fcmToken
          ) {
            notifications.push({
              token: parentCommentAuthor.fcmToken,
              title: `[${groupDoc.displayName}] 새로운 답글`,
              body: `${commentAuthorName}님이 답글을 남겼습니다`,
              data: {
                type: 'comment',
                groupId: diaryDoc.group,
                groupName: groupDoc.displayName,
                diaryId: diaryId,
                commentId: commentId,
                authorName: commentAuthorName,
              },
            });
          }
        }
      }

      // Case 2: Comment on diary (일기에 댓글)
      // Send notification to diary author (자기 자신 제외)
      const diaryAuthor = await this.accountModel.findById(diaryDoc.account).exec();
      if (diaryAuthor && diaryAuthor._id !== authorUid && diaryAuthor.fcmToken) {
        notifications.push({
          token: diaryAuthor.fcmToken,
          title: `[${groupDoc.displayName}] 새로운 댓글`,
          body: `${commentAuthorName}님이 댓글을 남겼습니다`,
          data: {
            type: 'comment',
            groupId: diaryDoc.group,
            groupName: groupDoc.displayName,
            diaryId: diaryId,
            commentId: commentId,
            authorName: commentAuthorName,
          },
        });
      }

      if (notifications.length === 0) {
        return;
      }

      // Send notifications
      await this.fcmService.sendMultipleNotifications(notifications);

      this.logger.log(`Sent ${notifications.length} comment notification(s)`);
    } catch (error) {
      this.logger.error('Error sending comment notification:', error);
    }
  }

  private async buildCommentResponse(
    comment: DiaryCommentDocument,
    likeInfo: { liked: boolean; likeCount: number } = { liked: false, likeCount: 0 },
  ): Promise<CommentResponse> {
    await comment.populate('account', 'displayName');

    const account = comment.account as unknown as {
      _id: string;
      displayName: string;
    };

    return {
      _id: comment._id,
      diary: comment.diary,
      content: comment.content,
      parentComment: comment.parentComment,
      deleted: comment.deleted ?? false,
      likeCount: likeInfo.likeCount,
      liked: likeInfo.liked,
      author: {
        uid: account._id,
        displayName: account.displayName,
      },
      createdAt: comment.createdAt.getTime(),
      updatedAt: comment.updatedAt.getTime(),
    };
  }
}
