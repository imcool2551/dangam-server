import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from './schemas/group.schema';
import { GroupController } from './controllers/group.controller';
import { GroupService } from './services/group.service';
import {
  AccountRoles,
  AccountRolesSchema,
} from '../account/schema/account-roles.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Group.name,
        schema: GroupSchema,
      },
      {
        name: AccountRoles.name,
        schema: AccountRolesSchema,
      },
    ]),
  ],
  controllers: [GroupController],
  providers: [GroupService],
})
export class GroupModule {}
