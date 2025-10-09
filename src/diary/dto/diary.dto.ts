import { IsArray, IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AssetLocation } from '../interfaces/diary.interface';

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

export class ListDiaryDto {
  @IsOptional()
  @IsString()
  next?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20
}

export class DiaryResponse {
  _id: string
  title: string
  content?: string
  images: {
    src?: AssetLocation
    dst?: AssetLocation
  }[]
  account: string
  displayName: string
  createdAt: number
  updatedAt: number
}

export class DiaryListResponse {
  items: DiaryResponse[]
  next?: string
}
