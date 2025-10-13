import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../account/schema/account.schema';
import * as admin from 'firebase-admin';

import serviceAccount from '../certs/service-account.json';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private app: admin.app.App;

  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
  ) {
    // Firebase Admin SDK 초기화 (dangam-f1a9b 프로젝트)
    this.app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  }

  async registerToken(accountId: string, fcmToken: string): Promise<void> {
    try {
      await this.accountModel.updateOne(
        { _id: accountId },
        { $set: { fcmToken } },
      );
      this.logger.log(`FCM token registered for account: ${accountId}`);
    } catch (error) {
      this.logger.error('Error registering FCM token:', error);
      throw error;
    }
  }

  async deleteToken(accountId: string): Promise<void> {
    try {
      await this.accountModel.updateOne(
        { _id: accountId },
        { $unset: { fcmToken: '' } },
      );
      this.logger.log(`FCM token deleted for account: ${accountId}`);
    } catch (error) {
      this.logger.error('Error deleting FCM token:', error);
      throw error;
    }
  }

  /**
   * Send notifications using Firebase Admin SDK
   * Supports FCM native tokens
   */
  async sendMultipleNotifications(
    notifications: Array<{
      token: string;
      title: string;
      body: string;
      data?: Record<string, string>;
    }>,
  ) {
    try {
      if (notifications.length === 0) {
        this.logger.warn('No notifications to send');
        return;
      }

      // Prepare FCM messages
      const messages = notifications.map((notification) => ({
        token: notification.token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
        android: {
          priority: 'high' as const,
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      }));

      // Send to Firebase
      const response = await this.app.messaging().sendEach(messages);

      // Process response
      let successCount = 0;
      let failureCount = 0;

      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          successCount++;
        } else {
          failureCount++;
          this.logger.error(
            `Failed to send to token ${notifications[idx].token}: ${resp.error?.message}`,
            resp.error?.code,
          );
        }
      });

      this.logger.log(
        `FCM notifications sent: ${successCount} successful, ${failureCount} failed`,
      );

      return {
        successCount,
        failureCount,
        responses: response.responses,
      };
    } catch (error) {
      this.logger.error('Error sending FCM notifications:', error);
      throw error;
    }
  }
}
