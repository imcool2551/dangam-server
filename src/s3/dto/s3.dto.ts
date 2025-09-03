import { IsEnum } from 'class-validator';

export enum ImageFileExtension {
  JPG = 'jpg',
  JPEG = 'jpeg',
  PNG = 'png',
  GIF = 'gif',
  WEBP = 'webp',
}

export class GenerateUploadUrlDto {
  @IsEnum(ImageFileExtension)
  fileExtension: ImageFileExtension;
}
