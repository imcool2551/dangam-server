import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GroupCreateDto,
  GroupMemberResponse,
  GroupResponse,
  GroupUpdateDto,
} from '../dto/group.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Group, GroupDocument } from '../schemas/group.schema';
import { Model } from 'mongoose';
import {
  AccountRoles,
  AccountRolesDocument,
} from '../../account/schema/account-roles.schema';
import { Account, AccountDocument } from '../../account/schema/account.schema';
import moment from 'moment';
import { AccountRolesType, AuthPayload } from '../../auth/interfaces/auth.interface';
import { ConfigService } from '@nestjs/config';
import { AssetLocation } from '../../diary/interfaces/diary.interface';
import { GroupImageProcessor } from '../components/group-image-processor';
import { noop } from 'lodash';

@Injectable()
export class GroupService {
  private readonly bucketName: string;

  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(AccountRoles.name)
    private readonly accountRolesModel: Model<AccountRolesDocument>,
    @InjectModel(Account.name) private readonly accountModel: Model<AccountDocument>,
    private readonly configService: ConfigService,
    private readonly groupImageProcessor: GroupImageProcessor,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
  }

  async create(auth: AuthPayload, dto: GroupCreateDto): Promise<GroupResponse> {
    const thumbnailImage = dto.thumbnailImageKey
      ? {
          src: {
            bucket: this.bucketName,
            key: dto.thumbnailImageKey,
          } as AssetLocation,
        }
      : undefined;

    const group = await this.groupModel.create({
      displayName: dto.displayName,
      thumbnailImage,
      lastActivityAt: moment().valueOf(),
    });

    await this.accountRolesModel.create({
      group: group._id,
      account: auth.uid,
      role: AccountRolesType.owner,
    });

    // Trigger async thumbnail image transcoding (fire and forget)
    if (group.thumbnailImage?.src) {
      this.groupImageProcessor.processThumbnailImage(group._id).then(noop);
    }

    return {
      _id: group._id,
      displayName: group.displayName,
      lastActivityAt: group.lastActivityAt,
      role: AccountRolesType.owner,
      thumbnailImage: group.thumbnailImage,
    };
  }

  async findMyGroup(auth: AuthPayload): Promise<GroupResponse[]> {
    const result = await this.accountRolesModel.aggregate([
      { $match: { account: auth.uid } },
      {
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: '_id',
          as: 'group',
        },
      },
      { $unwind: '$group' },
      {
        $lookup: {
          from: 'accountroles',
          localField: 'group._id',
          foreignField: 'group',
          as: 'memberRoles',
        },
      },
      { $project: { group: 1, role: 1, memberCount: { $size: '$memberRoles' } } },
      {
        $sort: {
          'group.lastActivityAt': -1,
        },
      },
    ]);

    return result.map((each) => ({
      _id: each.group._id,
      displayName: each.group.displayName,
      lastActivityAt: each.group.lastActivityAt,
      role: each.role,
      thumbnailImage: each.group.thumbnailImage,
      memberCount: each.memberCount,
    }));
  }

  async findGroupMembers(group: string): Promise<GroupMemberResponse[]> {
    const result = await this.accountRolesModel.aggregate([
      { $match: { group: group } },
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: '$account' },
      {
        $sort: {
          role: -1 // Role descending order (owner > editor > member)
        }
      },
      {
        $project: {
          uid: '$account._id',
          role: 1,
          displayName: '$account.displayName'
        }
      }
    ]);

    return result;
  }

  async updateGroup(
    group: string,
    dto: GroupUpdateDto,
  ): Promise<GroupResponse> {
    // Get existing group for comparison
    const existingGroup = await this.groupModel.findById(group).exec();
    if (!existingGroup) {
      throw new BadRequestException();
    }

    // Check if thumbnail image changed
    const oldThumbnailKey = existingGroup.thumbnailImage?.src?.key;
    const newThumbnailKey = dto.thumbnailImageKey;
    const thumbnailImageChanged = oldThumbnailKey !== newThumbnailKey;

    // Prepare update data
    const updateData: any = {
      displayName: dto.displayName,
    };

    if (dto.thumbnailImageKey) {
      updateData.thumbnailImage = {
        src: {
          bucket: this.bucketName,
          key: dto.thumbnailImageKey,
        } as AssetLocation,
      };
    } else {
      updateData.thumbnailImage = undefined;
    }

    const updatedGroup = await this.groupModel.findOneAndUpdate(
      { _id: group },
      updateData,
      { new: true },
    );

    if (updatedGroup === null) {
      throw new BadRequestException();
    }

    // Re-run transcoder if thumbnail image changed
    if (thumbnailImageChanged && dto.thumbnailImageKey) {
      this.groupImageProcessor
        .processThumbnailImage(updatedGroup._id, true)
        .then(noop);
    }

    return {
      _id: updatedGroup._id,
      displayName: updatedGroup.displayName,
      lastActivityAt: updatedGroup.lastActivityAt,
      thumbnailImage: updatedGroup.thumbnailImage,
    };
  }
}
