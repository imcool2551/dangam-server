import { HydratedDocument } from 'mongoose';
import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';

@Schema({
  _id: false,
  timestamps: true,
})
export class Group {
  @Prop({ type: String, default: () => nanoid(16) })
  _id: string;

  @Prop({ type: String, required: true })
  displayName: string;

  // @Prop({ type: Object })
  // invitation: IInvitation;

  @Prop({ type: Number, required: true })
  lastActivityAt: number;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

export type GroupDocument = HydratedDocument<Group>;
