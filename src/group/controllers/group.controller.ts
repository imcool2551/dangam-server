import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Auth } from '../../auth/auth.decorator';
import { AccountRolesType, AuthPayload } from '../../auth/auth.interface';
import { GroupCreateDto, GroupResponse, GroupUpdateDto } from '../dto/group.dto';
import { Role } from '../../auth/role.decorator';
import { GroupService } from '../services/group.service';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @Role(AccountRolesType.guest)
  create(
    @Auth() auth: AuthPayload,
    @Body() dto: GroupCreateDto,
  ): Promise<GroupResponse> {
    return this.groupService.create(auth, dto);
  }

  @Get()
  @Role(AccountRolesType.guest)
  findMyGroup(@Auth() auth: AuthPayload): Promise<GroupResponse[]> {
    return this.groupService.findMyGroup(auth)
  }

  @Put('/:group')
  @Role(AccountRolesType.editor)
  updateGroup(@Param('group') group: string, @Body() dto: GroupUpdateDto) {
    return this.groupService.updateGroup(group, dto)
  }
}
