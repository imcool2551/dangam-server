import { IsNotEmpty, IsString } from 'class-validator';
import { AccountRolesType } from '../../auth/interfaces/auth.interface';

export class GroupCreateDto {
  @IsString()
  @IsNotEmpty()
  displayName: string;
}

export class GroupUpdateDto {
  @IsString()
  @IsNotEmpty()
  displayName: string;
}

export class GroupResponse {
  _id: string;
  displayName: string;
  lastActivityAt: number;
  role?: AccountRolesType;
}
