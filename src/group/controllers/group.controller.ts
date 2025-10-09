import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { Auth } from '../../auth/decorators/auth.decorator';
import {
  AccountRolesType,
  AuthPayload,
} from '../../auth/interfaces/auth.interface';
import {
  GroupCreateDto,
  GroupInviteResponse,
  GroupResponse,
  GroupUpdateDto,
} from '../dto/group.dto';
import { Role } from '../../auth/decorators/role.decorator';
import { GroupService } from '../services/group.service';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  create(
    @Auth() auth: AuthPayload,
    @Body() dto: GroupCreateDto,
  ): Promise<GroupResponse> {
    return this.groupService.create(auth, dto);
  }

  @Get()
  findMyGroup(@Auth() auth: AuthPayload): Promise<GroupResponse[]> {
    return this.groupService.findMyGroup(auth);
  }

  @Get('/:group/invite')
  @Role(AccountRolesType.editor)
  getGroupInviteLink(
    @Param('group') group: string,
  ): Promise<GroupInviteResponse> {
    return this.groupService.getGroupInviteLink(group);
  }

  @Post('/join/:inviteToken')
  joinGroupByInvite(
    @Auth() auth: AuthPayload,
    @Param('inviteToken') inviteToken: string,
  ): Promise<GroupResponse> {
    return this.groupService.joinGroupByInvite(auth, inviteToken);
  }

  @Put('/:group')
  @Role(AccountRolesType.editor)
  updateGroup(@Param('group') group: string, @Body() dto: GroupUpdateDto) {
    return this.groupService.updateGroup(group, dto);
  }

  @Delete('/:group')
  @Role(AccountRolesType.owner)
  deleteGroup(@Param('group') group: string): Promise<void> {
    return this.groupService.deleteGroup(group);
  }
}
