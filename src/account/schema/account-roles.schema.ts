// account-roles.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { nanoid } from 'nanoid';
import { Group } from '../../group/schemas/group.schema';
import { HydratedDocument } from 'mongoose';

@Schema({
  _id: false,
  timestamps: true
})
export class AccountRoles {
  @Prop({ type: String, default: () => nanoid(16) })
  _id: string

  // @Prop({ type: String, required: true, ref: Account.name })
  // account: string

  @Prop({ type: String, required: true, ref: Group.name })
  group: string

  @Prop({ type: String, enum: AccountRoles })
  role: AccountRoles
}

export const AccountRolesSchema = SchemaFactory.createForClass(AccountRoles)

export type AccountRolesDocument = HydratedDocument<AccountRoles>
