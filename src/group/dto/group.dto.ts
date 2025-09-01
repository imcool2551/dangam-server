import { IsString } from 'class-validator';

export class GroupCreateDto {
  @IsString()
  displayName: string
}

export class GroupResponse {
  _id: string
  displayName: string
}
