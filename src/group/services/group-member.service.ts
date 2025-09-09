import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AccountRoles,
  AccountRolesDocument,
} from '../../account/schema/account-roles.schema';
import {
  GroupMemberResponse,
  RemoveMemberDto,
  UpdateMemberRoleDto,
} from '../dto/group.dto';
import {
  AccountRolesType,
  AuthPayload,
} from '../../auth/interfaces/auth.interface';

@Injectable()
export class GroupMemberService {
  constructor(
    @InjectModel(AccountRoles.name)
    private readonly accountRolesModel: Model<AccountRolesDocument>,
  ) {}

  async findGroupMembers(group: string): Promise<GroupMemberResponse[]> {
    const result = await this.accountRolesModel.aggregate([
      { $match: { group: group } },
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'account',
        },
      },
      { $unwind: '$account' },
      {
        $sort: {
          role: -1, // Role descending order (owner > editor > member)
        },
      },
      {
        $project: {
          uid: '$account._id',
          role: 1,
          displayName: '$account.displayName',
        },
      },
    ]);

    return result;
  }

  // Owner only - update member role
  async updateMemberRole(group: string, dto: UpdateMemberRoleDto) {
    const existingMember = await this.accountRolesModel.findOne({
      account: dto.uid,
      group: group,
    });

    if (!existingMember) {
      throw new BadRequestException('Member not found in this group');
    }

    // Cannot change owner role
    if (existingMember.role === AccountRolesType.owner) {
      throw new BadRequestException('Cannot change owner role');
    }

    // Cannot assign owner role
    if (dto.role === AccountRolesType.owner) {
      throw new BadRequestException('Cannot assign owner role');
    }

    await this.accountRolesModel.updateOne(
      {
        account: dto.uid,
        group: group,
      },
      {
        role: dto.role,
      },
    );

    return { message: 'Member role updated successfully' };
  }

  // Editor+ - remove member from group (only lower roles)
  async removeMember(auth: AuthPayload, group: string, dto: RemoveMemberDto) {
    // Get current user's role
    const currentUserRole = await this.accountRolesModel.findOne({
      account: auth.uid,
      group: group,
    });

    const targetMember = await this.accountRolesModel.findOne({
      account: dto.uid,
      group: group,
    });

    if (!targetMember) {
      throw new BadRequestException('Member not found in this group');
    }

    // Cannot remove user with same or higher role
    if (targetMember.role >= currentUserRole.role) {
      throw new BadRequestException(
        'Cannot remove member with same or higher role',
      );
    }

    await this.accountRolesModel.deleteOne({
      account: dto.uid,
      group: group,
    });

    return { message: 'Member removed successfully' };
  }

  async leaveGroup(auth: AuthPayload, group: string) {
    const userRole = await this.accountRolesModel.findOne({
      account: auth.uid,
      group: group,
    });

    if (!userRole) {
      throw new BadRequestException('Not a member of this group');
    }

    if (userRole.role === AccountRolesType.owner) {
      throw new BadRequestException('Owner cannot leave the group');
    }

    await this.accountRolesModel.deleteOne({
      account: auth.uid,
      group: group,
    });

    return { message: 'Successfully left the group' };
  }
}
