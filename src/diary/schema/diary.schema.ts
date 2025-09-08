import { HydratedDocument } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';
import { Group } from '../../group/schemas/group.schema';
import { Account } from '../../account/schema/account.schema';
import { AssetLocation } from '../interfaces/diary.interface';

@Schema({
  _id: false,
  timestamps: true,
})
export class Diary {
  @Prop({ type: String, default: () => nanoid(16) })
  _id: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  content?: string;

  @Prop({
    type: [{
      src: {
        bucket: { type: String },
        key: { type: String }
      },
      dst: {
        bucket: { type: String },
        key: { type: String }
      }
    }],
    default: []
  })
  images: {
    src?: AssetLocation
    dst?: AssetLocation
  }[]

  @Prop({ type: String, required: true, ref: Account.name })
  account: string;

  @Prop({ type: String, required: true, ref: Group.name })
  group: string;

  @Prop({ type: Boolean, required: true })
  deleted: boolean;

  // TODO @sangwook: comments
}

export const DiarySchema = SchemaFactory.createForClass(Diary);

export type DiaryDocument = HydratedDocument<Diary> & {
  createdAt: Date
  updatedAt: Date
};
