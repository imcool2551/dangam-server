import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  parentComment?: string;
}

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CommentResponse {
  _id: string;
  diary: string;
  content: string;
  parentComment?: string;
  author: {
    uid: string;
    displayName: string;
  };
  createdAt: number;
  updatedAt: number;
  replies?: CommentResponse[];
}