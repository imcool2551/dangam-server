import { forwardRef, Module } from '@nestjs/common';
import { FcmService } from './fcm.service';
import { FcmController } from './fcm.controller';
import { FcmTestController } from './fcm-test.controller';
import { FcmTestService } from './fcm-test.service';
import { AccountModule } from '../account/account.module';
import { DiaryModule } from '../diary/diary.module';
import { GroupModule } from '../group/group.module';

@Module({
  imports: [
    forwardRef(() => AccountModule),
    forwardRef(() => DiaryModule),
    forwardRef(() => GroupModule)
  ],
  controllers: [FcmController, FcmTestController],
  providers: [FcmService, FcmTestService],
  exports: [FcmService],
})
export class FcmModule {}
