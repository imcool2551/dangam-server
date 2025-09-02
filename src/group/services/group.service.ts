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
import { AccountRolesType, AuthPayload } from '../../auth/interfaces/auth.interface';
import moment from 'moment';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(AccountRoles.name)
    private readonly accountRolesModel: Model<AccountRolesDocument>,
  ) {}

  async create(auth: AuthPayload, dto: GroupCreateDto): Promise<GroupResponse> {
    throw 'TODO'
  }

  async findMyGroup(auth: AuthPayload): Promise<GroupResponse[]> {
    throw 'TODO'
  }

  async updateGroup(
    group: string,
    dto: GroupUpdateDto,
  ): Promise<GroupResponse> {
    throw 'TODO'
  }
}
