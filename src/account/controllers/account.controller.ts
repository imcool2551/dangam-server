import { Body, Controller, Patch, HttpCode } from '@nestjs/common';
import { AccountService } from '../services/account.service';
import { UpdateDisplayNameDto } from '../dto/account.dto';
import { Auth } from '../../auth/decorators/auth.decorator';
import { AuthPayload } from '../../auth/interfaces/auth.interface';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Patch('display-name')
  @HttpCode(204)
  updateDisplayName(
    @Auth() auth: AuthPayload,
    @Body() dto: UpdateDisplayNameDto,
  ): Promise<void> {
    return this.accountService.updateDisplayName(auth, dto);
  }
}
