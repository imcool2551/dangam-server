import { HydratedDocument } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';
import { AssetLocation } from '../../diary/interfaces/diary.interface';

@Schema({
  _id: false,
  timestamps: true,
})
export class Group {
  @Prop({ type: String, default: () => nanoid(16) })
  _id: string;

  @Prop({ type: String, required: true })
  displayName: string;

  @Prop({
    type: {
      src: {
        bucket: { type: String },
        key: { type: String }
      },
      dst: {
        bucket: { type: String },
        key: { type: String }
      }
    },
    _id: false
  })
  thumbnailImage?: {
    src?: AssetLocation
    dst?: AssetLocation
  }

  @Prop({ type: String, default: () => nanoid(16) })
  inviteToken: string;

  @Prop({ type: Number, required: true })
  lastActivityAt: number;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

export type GroupDocument = HydratedDocument<Group>;
