import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';
import { HydratedDocument } from 'mongoose';

@Schema({
  _id: false,
  timestamps: true,
})
export class Account {
  @Prop({ type: String, default: () => nanoid(16) })
  _id: string;

  // ssoType - 나중에 추가될 예정
  // ssoId - 나중에 추가될 예정

  @Prop({ type: String, required: true })
  displayName: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account)

export type AccountDocument = HydratedDocument<Account>
