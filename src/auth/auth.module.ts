import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { Account, AccountSchema } from '../account/schema/account.schema';
import {
  AccountRoles,
  AccountRolesSchema,
} from '../account/schema/account-roles.schema';
import { AccountModule } from '../account/account.module';
import { DiaryModule } from '../diary/diary.module';
import { GroupModule } from '../group/group.module';

@Module({
  imports: [
    AccountModule,
    DiaryModule,
    GroupModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'dangam-server-jwt-secret',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
