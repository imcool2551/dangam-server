import { Body, Controller, Post } from '@nestjs/common';
import { Auth } from '../../auth/auth.decorator';
import { AccountRoles, AuthPayload } from '../../auth/auth.interface';
import { GroupCreateDto, GroupResponse } from '../dto/group.dto';
import { Role } from '../../auth/role.decorator';
import { GroupService } from '../services/group.service';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @Role(AccountRoles.guest)
  create(
    @Auth() auth: AuthPayload,
    @Body() dto: GroupCreateDto,
  ): Promise<GroupResponse> {
    return this.groupService.create(dto);
  }
}
