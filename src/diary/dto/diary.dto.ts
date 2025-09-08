import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDiaryDto {
  @IsNotEmpty()
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  content?: string

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  imageKeys?: string[]
}

export class UpdateDiaryDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  content?: string

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  imageKeys?: string[]
}

export class DiaryResponse {
  _id: string
}
