import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

import serviceAccount from '../certs/service-account.json';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);

  private app: admin.app.App;

  constructor() {
    this.app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }

  async sendDataMessage(
    message: admin.messaging.TokenMessage,
    dryRun?: boolean,
  ) {
    return this.app
      .messaging()
      .send(
        {
          token: message.token,
          data: message.data,
        },
        dryRun,
      )
      .catch((err) => {
        this.logger.error('Error sending notification message:', err);
      });
  }
}
