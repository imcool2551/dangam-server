import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  CreateDiaryDto,
  DiaryResponse,
  UpdateDiaryDto,
} from '../dto/diary.dto';
import { AuthPayload } from '../../auth/interfaces/auth.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AssetLocation } from '../interfaces/diary.interface';
import { DiaryImageProcessor } from '../components/diary-image-processor';
import { FcmService } from '../../fcm/fcm.service';
import { AccountDocument } from '../../account/schema/account.schema';
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

  async update(
    auth: AuthPayload,
    group: string,
    diaryId: string,
    dto: UpdateDiaryDto,
  ): Promise<DiaryResponse> {
    // Find the diary and validate existence
    const existingDiary = await this.diaryModel
      .findOne({ _id: diaryId, group: group, deleted: false })
      .exec();

    if (!existingDiary) {
      throw new BadRequestException('Diary not found');
    }

    // Validate that the user is the author
    if (existingDiary.account !== auth.uid) {
      throw new ForbiddenException('You can only edit your own diary entries');
    }

    // Check if imageKeys changed
    const oldImageKeys = existingDiary.images.map((img) => img.src.key);
    const newImageKeys = dto.imageKeys || [];
    const imageKeysChanged =
      oldImageKeys.length !== newImageKeys.length ||
      oldImageKeys.some((key, index) => key !== newImageKeys[index]);

    // Prepare update data
    const updateData: any = {
      title: dto.title,
      content: dto.content,
    };

    if (dto.imageKeys) {
      updateData.images = dto.imageKeys.map((key) => ({
        src: {
          bucket: this.bucketName,
          key: key,
        } as AssetLocation,
      }));
    }

    // Update the diary
    const updatedDiary = await this.diaryModel
      .findByIdAndUpdate(diaryId, updateData, { new: true })
      .exec();

    // Re-run transcoder if imageKeys changed
    if (imageKeysChanged && dto.imageKeys && dto.imageKeys.length > 0) {
      this.diaryImageProcessor
        .processAllImages(updatedDiary!._id, true)
        .catch((error) => {
          this.logger.error(
            `Failed to process images for updated diary ${updatedDiary!._id}`,
            error,
          );
        });
    }

    return {
      _id: updatedDiary!._id,
    };
  }
}
