import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GroupCreateDto,
  GroupInviteResponse,
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
import moment from 'moment';
import {
  AccountRolesType,
  AuthPayload,
} from '../../auth/interfaces/auth.interface';
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
      { $match: { 'group.deleted': { $ne: true } } },
      {
        $lookup: {
          from: 'accountroles',
          localField: 'group._id',
          foreignField: 'group',
          as: 'memberRoles',
        },
      },
      {
        $project: { group: 1, role: 1, memberCount: { $size: '$memberRoles' } },
      },
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


  async getGroupInviteLink(groupId: string): Promise<GroupInviteResponse> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new BadRequestException('Group not found');
    }

    return {
      inviteLink: `https://growdangams.com/dangam/invite/${group.inviteToken}`,
    };
  }

  async joinGroupByInvite(
    auth: AuthPayload,
    inviteToken: string,
  ): Promise<GroupResponse> {
    const group = await this.groupModel.findOne({ inviteToken });
    if (!group) {
      throw new BadRequestException('Invalid invite link');
    }

    // Check if user is already a member
    const existingRole = await this.accountRolesModel.findOne({
      account: auth.uid,
      group: group._id,
    });

    if (existingRole) {
      throw new BadRequestException('Already a member of this group');
    }

    try {
      // Add user as member
      await this.accountRolesModel.create({
        account: auth.uid,
        group: group._id,
        role: AccountRolesType.member,
      });
    } catch (error) {
      // Handle duplicate key error from unique index
      if (error.code === 11000) {
        throw new BadRequestException('Already a member of this group');
      }
      throw error;
    }

    // Update group's last activity
    await this.groupModel.updateOne(
      { _id: group._id },
      { lastActivityAt: moment().valueOf() },
    );

    return {
      _id: group._id,
      displayName: group.displayName,
      lastActivityAt: moment().valueOf(),
      role: AccountRolesType.member,
      thumbnailImage: group.thumbnailImage,
    };
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

  async deleteGroup(groupId: string): Promise<void> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new BadRequestException('Group not found');
    }

    if (group.deleted) {
      throw new BadRequestException('Group is already deleted');
    }

    await this.groupModel.updateOne(
      { _id: groupId },
      { deleted: true }
    ).exec();
  }
}
