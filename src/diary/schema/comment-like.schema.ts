import { HydratedDocument } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';
import { Account } from '../../account/schema/account.schema';
import { DiaryComment } from './diary-comment.schema';

@Schema({
  _id: false,
  timestamps: true,
})
export class CommentLike {
  @Prop({ type: String, default: () => nanoid(16) })
  _id: string;

  @Prop({ type: String, required: true, ref: Account.name })
  account: string;

  @Prop({ type: String, required: true, ref: DiaryComment.name })
  comment: string;
}

export const CommentLikeSchema = SchemaFactory.createForClass(CommentLike);

// Unique index to prevent duplicate likes
CommentLikeSchema.index({ account: 1, comment: 1 }, { unique: true });
// Index for querying likes by comment
CommentLikeSchema.index({ comment: 1 });

export type CommentLikeDocument = HydratedDocument<CommentLike> & {
  createdAt: Date;
  updatedAt: Date;
};
