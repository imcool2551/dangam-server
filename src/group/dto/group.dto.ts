import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AccountRolesType } from '../../auth/interfaces/auth.interface';
import { AssetLocation } from '../../diary/interfaces/diary.interface';
import { Type } from 'class-transformer';

export class GroupCreateDto {
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsOptional()
  @IsString()
  thumbnailImageKey?: string;
}

export class GroupUpdateDto {
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsOptional()
  @IsString()
  thumbnailImageKey?: string;
}

export class GroupResponse {
  _id: string;
  displayName: string;
  lastActivityAt: number;
  role?: AccountRolesType;
  thumbnailImage?: {
    src?: AssetLocation;
    dst?: AssetLocation;
  };
  memberCount?: number;
}

export class GroupMemberResponse {
  uid: string;
  role: AccountRolesType;
  displayName: string;
}

export class GroupInviteResponse {
  inviteLink: string;
}

export class UpdateMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  uid: string;

  @IsEnum(AccountRolesType)
  role: AccountRolesType;
}

export class RemoveMemberDto {
  @IsString()
  @IsNotEmpty()
  uid: string;
}
