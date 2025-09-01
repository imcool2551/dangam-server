import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import moment from 'moment-timezone'

moment.tz.setDefault('Asia/Seoul')

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
