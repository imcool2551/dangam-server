import { HydratedDocument } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';
import { Account } from '../../account/schema/account.schema';
import { Diary } from './diary.schema';

@Schema({
  _id: false,
  timestamps: true,
})
export class DiaryComment {
  @Prop({ type: String, default: () => nanoid(16) })
  _id: string;

  @Prop({ type: String, required: true, ref: Diary.name })
  diary: string;

  @Prop({ type: String, required: true, ref: Account.name })
  account: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, ref: DiaryComment.name })
  parentComment?: string;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;
}

export const DiaryCommentSchema = SchemaFactory.createForClass(DiaryComment);

export type DiaryCommentDocument = HydratedDocument<DiaryComment> & {
  createdAt: Date;
  updatedAt: Date;
};