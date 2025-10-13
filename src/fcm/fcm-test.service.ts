import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Diary, DiaryDocument } from '../diary/schema/diary.schema';
import {
  DiaryComment,
  DiaryCommentDocument,
} from '../diary/schema/diary-comment.schema';
import { Account, AccountDocument } from '../account/schema/account.schema';
import { Group, GroupDocument } from '../group/schemas/group.schema';
import {
  AccountRoles,
  AccountRolesDocument,
} from '../account/schema/account-roles.schema';
import { FcmService } from './fcm.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FcmTestService {
  private readonly logger = new Logger(FcmTestService.name);
  private readonly bucketName: string;

  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
    @InjectModel(DiaryComment.name)
    private readonly diaryCommentModel: Model<DiaryCommentDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
    @InjectModel(AccountRoles.name)
    private readonly accountRolesModel: Model<AccountRolesDocument>,
    private readonly fcmService: FcmService,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
  }

  async createTestDiary(groupId: string, authorAccountId: string) {
    // Validate group exists
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Validate author exists
    const author = await this.accountModel.findById(authorAccountId).exec();
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    // Validate author is a member of the group
    const membership = await this.accountRolesModel
      .findOne({ group: groupId, account: authorAccountId })
      .exec();

    if (!membership) {
      throw new NotFoundException('Author is not a member of this group');
    }

    // Create test diary
    const diary = await this.diaryModel.create({
      title: '[테스트] FCM 푸시 알림 테스트',
      content: '이 일기는 FCM 푸시 알림 테스트를 위해 자동 생성되었습니다.',
      images: [],
      account: authorAccountId,
      group: groupId,
      deleted: false,
    });

    this.logger.log(`Test diary created: ${diary._id}`);

    // Send FCM notifications
    await this.sendNotificationToGroupMembers(
      authorAccountId,
      groupId,
      diary._id,
    );

    return {
      success: true,
      diaryId: diary._id,
      message: 'Test diary created and notifications sent',
    };
  }

  async createTestComment(
    diaryId: string,
    authorAccountId: string,
    parentCommentId?: string,
  ) {
    // Validate diary exists
    const diary = await this.diaryModel.findById(diaryId).exec();
    if (!diary) {
      throw new NotFoundException('Diary not found');
    }

    // Validate author exists
    const author = await this.accountModel.findById(authorAccountId).exec();
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    // Validate parent comment if provided
    if (parentCommentId) {
      const parentComment = await this.diaryCommentModel
        .findById(parentCommentId)
        .exec();
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    // Create test comment
    const comment = await this.diaryCommentModel.create({
      diary: diaryId,
      account: authorAccountId,
      content: parentCommentId
        ? '[테스트] 이 답글은 FCM 푸시 알림 테스트를 위해 자동 생성되었습니다.'
        : '[테스트] 이 댓글은 FCM 푸시 알림 테스트를 위해 자동 생성되었습니다.',
      parentComment: parentCommentId,
    });

    this.logger.log(`Test comment created: ${comment._id}`);

    // Send FCM notifications
    await this.sendCommentNotification(
      authorAccountId,
      diaryId,
      comment._id,
      parentCommentId,
    );

    return {
      success: true,
      commentId: comment._id,
      message: 'Test comment created and notifications sent',
    };
  }

  private async sendNotificationToGroupMembers(
    authorUid: string,
    group: string,
    diaryId: string,
  ): Promise<void> {
    try {
      // Find all group members except the author
      const groupMembers = await this.accountRolesModel
        .find({ group: group, account: { $ne: authorUid } })
        .populate('account');

      // Get author info
      const author = await this.accountRolesModel
        .findOne({ group: group, account: authorUid })
        .populate('account')
        .exec();

      if (!author || !author.account) {
        this.logger.warn('Author not found for notification');
        return;
      }

      const authorAccount = author.account as unknown as AccountDocument;
      const authorName = authorAccount.displayName;

      // Get group info
      const groupDoc = await this.groupModel.findById(group).exec();
      if (!groupDoc) {
        this.logger.warn('Group not found for notification');
        return;
      }

      // Filter members who have FCM tokens
      const membersWithTokens = groupMembers
        .map((member) => member.account as unknown as AccountDocument)
        .filter((account) => account && account.fcmToken);

      if (membersWithTokens.length === 0) {
        this.logger.warn('No group members with FCM tokens found');
        return;
      }

      // Prepare FCM notifications
      const notifications = membersWithTokens.map((account) => ({
        token: account.fcmToken!,
        title: '새로운 일기가 작성되었습니다',
        body: `${authorName}님이 새 일기를 작성했습니다`,
        data: {
          type: 'diary',
          groupId: group,
          groupName: groupDoc.displayName,
          diaryId: diaryId,
          authorName: authorName,
        },
      }));

      // Send notifications
      await this.fcmService.sendMultipleNotifications(notifications);

      this.logger.log(
        `Sent FCM notifications to ${notifications.length} group members`,
      );
    } catch (error) {
      this.logger.error(
        'Error sending FCM notifications to group members:',
        error,
      );
    }
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
              title: '새로운 답글이 달렸습니다',
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
      const diaryAuthor = await this.accountModel
        .findById(diaryDoc.account)
        .exec();
      if (
        diaryAuthor &&
        diaryAuthor._id !== authorUid &&
        diaryAuthor.fcmToken
      ) {
        notifications.push({
          token: diaryAuthor.fcmToken,
          title: '새로운 댓글이 달렸습니다',
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
        this.logger.warn('No recipients with FCM tokens found');
        return;
      }

      // Send notifications
      await this.fcmService.sendMultipleNotifications(notifications);

      this.logger.log(`Sent ${notifications.length} comment notification(s)`);
    } catch (error) {
      this.logger.error('Error sending comment notification:', error);
    }
  }
}
