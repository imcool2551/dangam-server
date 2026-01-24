import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';
import { HydratedDocument } from 'mongoose';
import { SsoType } from '../../auth/interfaces/sso.enum';

@Schema({
  _id: false,
  timestamps: true,
})
export class Account {
  @Prop({ type: String, default: () => nanoid(16) })
  _id: string;

  @Prop({ type: String, enum: SsoType, required: true })
  ssoType: SsoType;

  @Prop({ type: String })
  ssoId?: string;

  @Prop({ type: String, sparse: true, unique: true })
  email?: string;

  @Prop({ type: String })
  passwordHash?: string;

  @Prop({ type: String, required: true })
  displayName: string;

  @Prop({ type: String })
  fcmToken?: string;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

export type AccountDocument = HydratedDocument<Account>;
