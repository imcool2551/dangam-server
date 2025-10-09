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
import { AccountRolesType, AuthPayload } from '../../auth/interfaces/auth.interface';
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
import { Group, GroupDocument } from '../../group/schemas/group.schema';
import moment from 'moment';
import { noop } from 'lodash';
import { toDiaryResponse, PopulatedDiaryDocument } from '../utils/diary-transformer';

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);
  private readonly bucketName: string;

  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
    @InjectModel(AccountRoles.name)
    private readonly accountRolesModel: Model<AccountRolesDocument>,
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
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
      this.diaryImageProcessor.processAllImages(savedDiary._id).then(noop);
    }

    // Update group's last activity time
    this.updateGroupActivity(group).then(noop);

    // Send FCM notifications to group members (excluding the author)
    this.sendNotificationToGroupMembers(auth.uid, group).then(noop);

    return toDiaryResponse(savedDiary as PopulatedDiaryDocument);
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
    diary: string,
    dto: UpdateDiaryDto,
  ): Promise<DiaryResponse> {
    // Find the diary and validate existence
    const existingDiary = await this.diaryModel
      .findOne({ _id: diary, group: group, deleted: false })
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
      .findByIdAndUpdate(diary, updateData, { new: true })
      .exec();

    // Re-run transcoder if imageKeys changed
    if (imageKeysChanged && dto.imageKeys && dto.imageKeys.length > 0) {
      this.diaryImageProcessor
        .processAllImages(updatedDiary!._id, true)
        .then(noop);
    }

    return toDiaryResponse(updatedDiary! as PopulatedDiaryDocument);
  }

  async delete(
    auth: AuthPayload,
    group: string,
    diary: string,
  ): Promise<DiaryResponse> {
    // Find the diary and validate existence
    const existingDiary = await this.diaryModel
      .findOne({ _id: diary, group: group, deleted: false })
      .exec();

    if (!existingDiary) {
      throw new BadRequestException('Diary not found');
    }

    // Check if user can delete: either author or editor+
    const userGroupRole = auth.acl[group];
    const isAuthor = existingDiary.account === auth.uid;
    const isEditor = userGroupRole >= AccountRolesType.editor;

    if (!isAuthor && !isEditor) {
      throw new ForbiddenException(
        'You can only delete your own diary entries or need editor permissions',
      );
    }

    // Soft delete by setting deleted flag to true
    const deletedDiary = await this.diaryModel
      .findByIdAndUpdate(diary, { deleted: true }, { new: true })
      .exec();

    return toDiaryResponse(deletedDiary! as PopulatedDiaryDocument);
  }

  private async updateGroupActivity(group: string): Promise<void> {
    await this.groupModel
      .updateOne({ _id: group }, { lastActivityAt: moment().valueOf() })
      .exec();
  }
}
