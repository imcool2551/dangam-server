import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class UpdateDisplayNameDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20)
  displayName: string;
}
