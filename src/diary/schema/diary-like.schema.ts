import { HydratedDocument } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';
import { Account } from '../../account/schema/account.schema';
import { Diary } from './diary.schema';

@Schema({
  _id: false,
  timestamps: true,
})
export class DiaryLike {
  @Prop({ type: String, default: () => nanoid(16) })
  _id: string;

  @Prop({ type: String, required: true, ref: Account.name })
  account: string;

  @Prop({ type: String, required: true, ref: Diary.name })
  diary: string;
}

export const DiaryLikeSchema = SchemaFactory.createForClass(DiaryLike);

// Unique index to prevent duplicate likes
DiaryLikeSchema.index({ account: 1, diary: 1 }, { unique: true });
// Index for querying likes by diary
DiaryLikeSchema.index({ diary: 1 });

export type DiaryLikeDocument = HydratedDocument<DiaryLike> & {
  createdAt: Date;
  updatedAt: Date;
};
