import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GroupCreateDto,
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
import { AccountRolesType, AuthPayload } from '../../auth/interfaces/auth.interface';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(AccountRoles.name)
    private readonly accountRolesModel: Model<AccountRolesDocument>,
  ) {}

  async create(auth: AuthPayload, dto: GroupCreateDto): Promise<GroupResponse> {
    const group = await this.groupModel.create({
      displayName: dto.displayName,
      lastActivityAt: moment().valueOf(),
    });

    await this.accountRolesModel.create({
      group: group._id,
      account: auth.uid,
      role: AccountRolesType.owner,
    });

    return {
      _id: group._id,
      displayName: group.displayName,
      lastActivityAt: group.lastActivityAt,
      role: AccountRolesType.owner,
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
      { $project: { group: 1, role: 1 } },
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
    }));
  }

  async updateGroup(
    group: string,
    dto: GroupUpdateDto,
  ): Promise<GroupResponse> {
    const updatedGroup = await this.groupModel.findOneAndUpdate(
      { _id: group },
      { displayName: dto.displayName },
      { new: true },
    );

    if (updatedGroup === null) {
      throw new BadRequestException();
    }

    return {
      _id: updatedGroup._id,
      displayName: updatedGroup.displayName,
      lastActivityAt: updatedGroup.lastActivityAt
    };
  }
}
