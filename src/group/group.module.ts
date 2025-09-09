import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from './schemas/group.schema';
import { GroupController } from './controllers/group.controller';
import { GroupService } from './services/group.service';
import { AccountModule } from '../account/account.module';
import { GroupImageProcessor } from './components/group-image-processor';
import { ImageTranscoder } from '../diary/components/image-transcoder';

const GroupMongooseModule = MongooseModule.forFeature([
  {
    name: Group.name,
    schema: GroupSchema,
  },
]);

@Module({
  imports: [AccountModule, GroupMongooseModule],
  controllers: [GroupController],
  providers: [GroupService, GroupImageProcessor, ImageTranscoder],
  exports: [GroupMongooseModule],
})
export class GroupModule {}
