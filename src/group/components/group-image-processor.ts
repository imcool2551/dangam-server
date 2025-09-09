import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument } from '../schemas/group.schema';
import { AssetLocation } from '../../diary/interfaces/diary.interface';
import { S3ImageService } from '../../s3/services/s3-image.service';

@Injectable()
export class GroupImageProcessor {
  private readonly logger = new Logger(GroupImageProcessor.name);

  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    private readonly s3ImageService: S3ImageService,
  ) {}

  async processThumbnailImage(groupId: string, forceReprocess: boolean = false): Promise<void> {
    try {
      const group = await this.groupModel.findById(groupId).lean();
      if (!group) {
        this.logger.error(`Group not found: ${groupId}`);
        return;
      }

      if (group.thumbnailImage?.src && (!group.thumbnailImage.dst || forceReprocess)) {
        try {
          const result = await this.s3ImageService.transcodeImage(group.thumbnailImage.src);
          await this.updateImageDst(groupId, result.dst);
          
          this.logger.log(
            `Successfully processed thumbnail image for group ${groupId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process thumbnail image for group ${groupId}`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process thumbnail image for group ${groupId}`, error);
    }
  }


  private async updateImageDst(
    groupId: string,
    dst: AssetLocation,
  ): Promise<void> {
    try {
      const updateQuery = {
        'thumbnailImage.dst': dst,
      };

      const result = await this.groupModel
        .updateOne({ _id: groupId }, { $set: updateQuery })
        .exec();

      if (result.matchedCount === 0) {
        throw new Error(`Group not found: ${groupId}`);
      }

      if (result.modifiedCount === 0) {
        this.logger.warn(
          `No changes made to group ${groupId}, thumbnail image`,
        );
      }

      this.logger.debug(
        `Updated dst for group ${groupId}, thumbnail image`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update thumbnail image dst for group ${groupId}`,
        error,
      );
    }
  }

}