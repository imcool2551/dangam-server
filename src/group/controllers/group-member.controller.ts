import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Auth } from '../../auth/decorators/auth.decorator';
import {
  AccountRolesType,
  AuthPayload,
} from '../../auth/interfaces/auth.interface';
import {
  GroupMemberResponse,
  RemoveMemberDto,
  UpdateMemberRoleDto,
} from '../dto/group.dto';
import { Role } from '../../auth/decorators/role.decorator';
import { GroupMemberService } from '../services/group-member.service';

@Controller('group')
export class GroupMemberController {
  constructor(private readonly groupMemberService: GroupMemberService) {}

  @Get('/:group/members')
  @Role(AccountRolesType.member)
  findGroupMembers(
    @Param('group') group: string,
  ): Promise<GroupMemberResponse[]> {
    return this.groupMemberService.findGroupMembers(group);
  }

  @Put('/:group/members/role')
  @Role(AccountRolesType.owner)
  updateMemberRole(
    @Auth() auth: AuthPayload,
    @Param('group') group: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.groupMemberService.updateMemberRole(auth, group, dto);
  }

  @Post('/:group/members/remove')
  @Role(AccountRolesType.editor)
  removeMember(
    @Auth() auth: AuthPayload,
    @Param('group') group: string,
    @Body() dto: RemoveMemberDto,
  ) {
    return this.groupMemberService.removeMember(auth, group, dto);
  }

  @Post('/:group/leave')
  @Role(AccountRolesType.member)
  leaveGroup(
    @Auth() auth: AuthPayload,
    @Param('group') group: string,
  ) {
    return this.groupMemberService.leaveGroup(auth, group);
  }
}