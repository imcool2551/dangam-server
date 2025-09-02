import { IsString } from 'class-validator';
import { AccountRolesType } from '../../auth/auth.interface';

export class GroupCreateDto {
  @IsString()
  displayName: string
}

export class GroupUpdateDto {
  @IsString()
  displayName: string
}

export class GroupResponse {
  _id: string
  displayName: string
  lastActivityAt: number
  role?: AccountRolesType
}
