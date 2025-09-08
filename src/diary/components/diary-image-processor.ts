import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { AssetLocation } from '../interfaces/diary.interface';
import { ImageTranscoder } from './image-transcoder';
import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import * as path from 'path';
import * as fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

@Injectable()
export class DiaryImageProcessor {
  private readonly logger = new Logger(DiaryImageProcessor.name);
  private readonly bucketName: string;
  private readonly s3: S3;
  private readonly tempDir: string;

  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
    private readonly configService: ConfigService,
    private readonly imageTranscoder: ImageTranscoder,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.tempDir = '/tmp/diary-transcoding';

    this.s3 = new S3({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async processAllImages(diaryId: string): Promise<void> {
    try {
      // Check if ImageMagick engine is available
      const engineAvailable = await this.imageTranscoder.checkEngine();
      if (!engineAvailable) {
        throw new Error('ImageMagick engine is not available');
      }

      const diary = await this.diaryModel.findById(diaryId).lean();
      if (!diary) {
        this.logger.error(`Diary not found: ${diaryId}`);
        return;
      }

      for (let i = 0; i < diary.images.length; i++) {
        const image = diary.images[i];
        if (image.src && !image.dst) {
          try {
            await this.processImage(diaryId, i, image.src);
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

  private async processImage(
    diaryId: string,
    imageIndex: number,
    src: AssetLocation,
  ): Promise<void> {
    const sessionId = nanoid(8);
    const localDir = path.join(this.tempDir, sessionId);
    const localInputFilePath = path.join(localDir, 'input');
    const localOutputDir = path.join(localDir, 'output');

    try {
      // Create temp directories
      await fs.mkdir(localDir, { recursive: true });
      await fs.mkdir(localOutputDir, { recursive: true });
      // Download from S3 to local path
      await this.downloadFromS3(src.bucket, src.key, localInputFilePath);

      // Transcode image
      const transcodeResult = await this.imageTranscoder.transcode(
        localInputFilePath,
        localOutputDir,
      );

      // Generate destination key
      const dstKey = this.generateDstKey(src.key);

      // Upload transcoded image to S3
      await this.uploadToS3(
        transcodeResult.outputPath,
        this.bucketName,
        dstKey,
      );

      // Update diary with dst info
      const dst: AssetLocation = {
        bucket: this.bucketName,
        key: dstKey,
      };

      await this.updateImageDst(diaryId, imageIndex, dst);

      this.logger.log(
        `Successfully processed image ${imageIndex} for diary ${diaryId}`,
      );
    } finally {
      // Cleanup temp files
      try {
        await fs.rm(localDir, { recursive: true, force: true });
      } catch (cleanupError) {
        this.logger.warn(
          `Failed to cleanup temp directory: ${localDir}`,
          cleanupError,
        );
      }
    }
  }

  private async downloadFromS3(
    bucket: string,
    key: string,
    localPath: string,
  ): Promise<void> {
    try {
      const dir = localPath.substring(0, localPath.lastIndexOf('/'));
      await fs.mkdir(dir, { recursive: true });

      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await this.s3.send(command);
      if (!response.Body) {
        throw new Error('No body in S3 response');
      }

      const writeStream = createWriteStream(localPath);
      await pipeline(response.Body as Readable, writeStream);
      this.logger.debug(`Downloaded ${bucket}/${key} to ${localPath}`);
    } catch (error) {
      this.logger.error(
        `downloadFile error: ${bucket}/${key} to ${localPath}`,
        error,
      );
      throw error;
    }
  }

  private async uploadToS3(
    localPath: string,
    bucket: string,
    key: string,
  ): Promise<void> {
    try {
      const fileBuffer = await fs.readFile(localPath);

      const putObjectCommand = {
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: 'image/webp',
      };

      await this.s3.putObject(putObjectCommand);

      this.logger.debug(`Uploaded ${localPath} to ${bucket}/${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${bucket}/${key}`, error);
      throw error;
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
      throw error;
    }
  }

  private generateDstKey(srcKey: string): string {
    const ext = path.extname(srcKey);
    const baseName = path.basename(srcKey, ext);
    const dirName = path.dirname(srcKey);

    // Add transcoded suffix and change extension to webp
    const dstKey = path.join(dirName, `${baseName}_transcoded.webp`);

    return dstKey;
  }
}
