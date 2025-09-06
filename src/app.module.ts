import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GroupModule } from './group/group.module';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { S3Module } from './s3/s3.module';
import { DiaryModule } from './diary/diary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DB_URI'),
      }),
    }),
    AccountModule,
    AuthModule,
    DiaryModule,
    GroupModule,
    S3Module,
  ],
  controllers: [AppController],
})
export class AppModule {}
