import { Injectable, Logger } from '@nestjs/common';
import { CreateDiaryDto, DiaryResponse } from '../dto/diary.dto';
import { AuthPayload } from '../../auth/interfaces/auth.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AssetLocation } from '../interfaces/diary.interface';
import { DiaryImageProcessor } from '../components/diary-image-processor';
import { FcmService } from '../../fcm/fcm.service';
import { Account, AccountDocument } from '../../account/schema/account.schema';
import {
  AccountRoles,
  AccountRolesDocument,
} from '../../account/schema/account-roles.schema';

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);
  private readonly bucketName: string;

  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(AccountRoles.name)
    private readonly accountRolesModel: Model<AccountRolesDocument>,
    private readonly configService: ConfigService,
    private readonly diaryImageProcessor: DiaryImageProcessor,
    private readonly fcmService: FcmService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
  }

  async create(
    auth: AuthPayload,
    group: string,
    dto: CreateDiaryDto,
  ): Promise<DiaryResponse> {
    const images =
      dto.imageKeys?.map((key) => ({
        src: {
          bucket: this.bucketName,
          key: key,
        } as AssetLocation,
      })) || [];

    const diary = new this.diaryModel({
      title: dto.title,
      content: dto.content,
      images: images,
      account: auth.uid,
      group: group,
      deleted: false,
    });

    const savedDiary = await diary.save();

    // Trigger async image transcoding (fire and forget)
    if (savedDiary.images.length > 0) {
      this.diaryImageProcessor
        .processAllImages(savedDiary._id)
        .catch((error) => {
          this.logger.error(
            `Failed to process images for diary ${savedDiary._id}`,
            error,
          );
        });
    }

    // Send FCM notifications to group members (excluding the author)
    this.sendNotificationToGroupMembers(auth.uid, group).catch((error) => {
      this.logger.error(
        `Failed to send FCM notifications for diary ${savedDiary._id}`,
        error,
      );
    });

    return {
      _id: savedDiary._id,
    };
  }

  private async sendNotificationToGroupMembers(
    authorUid: string,
    group: string,
  ): Promise<void> {
    try {
      // Find all group members except the author
      const groupMembers = await this.accountRolesModel
        .find({ group: group, account: { $ne: authorUid } })
        .populate('account');

      // Filter members who have FCM tokens
      const membersWithTokens = groupMembers
        .map((member) => member.account as unknown as AccountDocument)
        .filter((account) => account && account.fcmToken);

      if (membersWithTokens.length === 0) {
        return;
      }

      // Prepare FCM messages
      const messages = membersWithTokens.map((account) => ({
        token: account.fcmToken!,
        data: {
          title: 'New Diary Entry', // Placeholder
          body: 'Someone shared a new diary entry in your group', // Placeholder
          type: 'diary_created',
          group: group,
        },
      }));

      // Send notifications
      await this.fcmService.sendMultipleDataMessages(messages);

      this.logger.log(
        `Sent FCM notifications to ${messages.length} group members`,
      );
    } catch (error) {
      this.logger.error(
        'Error sending FCM notifications to group members:',
        error,
      );
    }
  }
}
