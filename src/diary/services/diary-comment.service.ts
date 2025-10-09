import { BadRequestException, Injectable } from '@nestjs/common';
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
import { DiaryDocument } from '../schema/diary.schema';

@Injectable()
export class DiaryCommentService {
  constructor(
    @InjectModel(DiaryComment.name)
    private readonly diaryCommentModel: Model<DiaryCommentDocument>,
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

    return this.buildCommentResponse(comment);
  }

  async getComments(diary: string): Promise<CommentResponse[]> {
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

    // Build hierarchical structure
    const commentMap = new Map<string, CommentResponse>();
    const rootComments: CommentResponse[] = [];

    // First pass: create all comment objects
    for (const comment of comments) {
      const commentResponse: CommentResponse = {
        _id: comment._id,
        diary: comment.diary,
        content: comment.deleted ? '[삭제된 댓글입니다]' : comment.content,
        parentComment: comment.parentComment,
        author: {
          uid: comment.author._id,
          displayName: comment.author.displayName,
        },
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

  private async buildCommentResponse(
    comment: DiaryCommentDocument,
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
      author: {
        uid: account._id,
        displayName: account.displayName,
      },
      createdAt: comment.createdAt.getTime(),
      updatedAt: comment.updatedAt.getTime(),
    };
  }
}
