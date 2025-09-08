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

  async sendMultipleDataMessages(
    messages: admin.messaging.TokenMessage[],
    dryRun?: boolean,
  ) {
    const messagesToSend = messages.map((message) => ({
      token: message.token,
      data: message.data,
    }));

    return this.app
      .messaging()
      .sendEach(messagesToSend, dryRun)
      .then((response) => {
        this.logger.log(`${response.successCount} messages sent successfully`);
        if (response.failureCount > 0) {
          this.logger.warn(`${response.failureCount} messages failed to send`);
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              this.logger.error(
                `Failed to send to token ${messages[idx].token}: ${resp.error?.message}`,
              );
            }
          });
        }
        return response;
      })
      .catch((err) => {
        this.logger.error('Error sending multiple notification messages:', err);
      });
  }
}
