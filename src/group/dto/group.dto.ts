import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AccountRolesType } from '../../auth/interfaces/auth.interface';
import { AssetLocation } from '../../diary/interfaces/diary.interface';

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
}
