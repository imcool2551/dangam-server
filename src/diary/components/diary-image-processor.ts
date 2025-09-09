import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { AssetLocation } from '../interfaces/diary.interface';
import { S3ImageService } from '../../s3/services/s3-image.service';

@Injectable()
export class DiaryImageProcessor {
  private readonly logger = new Logger(DiaryImageProcessor.name);

  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
    private readonly s3ImageService: S3ImageService,
  ) {}

  async processAllImages(diaryId: string, forceReprocess: boolean = false): Promise<void> {
    try {
      const diary = await this.diaryModel.findById(diaryId).lean();
      if (!diary) {
        this.logger.error(`Diary not found: ${diaryId}`);
        return;
      }

      for (let i = 0; i < diary.images.length; i++) {
        const image = diary.images[i];
        if (image.src && (!image.dst || forceReprocess)) {
          try {
            const result = await this.s3ImageService.transcodeImage(image.src);
            await this.updateImageDst(diaryId, i, result.dst);
            
            this.logger.log(
              `Successfully processed image ${i} for diary ${diaryId}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to process image ${i} for diary ${diaryId}`,
              error,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process images for diary ${diaryId}`, error);
    }
  }


  private async updateImageDst(
    diaryId: string,
    imageIndex: number,
    dst: AssetLocation,
  ): Promise<void> {
    try {
      const updateQuery = {
        [`images.${imageIndex}.dst`]: dst,
      };

      const result = await this.diaryModel
        .updateOne({ _id: diaryId }, { $set: updateQuery })
        .exec();

      if (result.matchedCount === 0) {
        throw new Error(`Diary not found: ${diaryId}`);
      }

      if (result.modifiedCount === 0) {
        this.logger.warn(
          `No changes made to diary ${diaryId}, image ${imageIndex}`,
        );
      }

      this.logger.debug(
        `Updated dst for diary ${diaryId}, image ${imageIndex}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update image dst for diary ${diaryId}, image ${imageIndex}`,
        error,
      );
    }
  }
}
