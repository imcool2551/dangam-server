import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, S3 } from '@aws-sdk/client-s3';
import { AssetLocation } from '../../diary/interfaces/diary.interface';
import { ImageTranscoder } from '../../image/components/image-transcoder';
import * as path from 'path';
import * as fs from 'fs/promises';
import { nanoid } from 'nanoid';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

export interface ImageTranscodingResult {
  uploadedKey: string;
  dst: AssetLocation;
}

@Injectable()
export class S3ImageService {
  private readonly logger = new Logger(S3ImageService.name);
  private readonly bucketName: string;
  private readonly s3: S3;
  private readonly tempDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageTranscoder: ImageTranscoder,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.tempDir = '/tmp/image-transcoding';

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

  async transcodeImage(src: AssetLocation): Promise<ImageTranscodingResult> {
    const engineAvailable = await this.imageTranscoder.checkEngine();
    if (!engineAvailable) {
      throw new Error('ImageMagick engine is not available');
    }

    const sessionId = nanoid(8);
    const localDir = path.join(this.tempDir, sessionId);
    const localInputFilePath = path.join(localDir, 'input');
    const localOutputDir = path.join(localDir, 'output');

    try {
      await fs.mkdir(localDir, { recursive: true });
      await fs.mkdir(localOutputDir, { recursive: true });

      await this.downloadFromS3(src.bucket, src.key, localInputFilePath);

      const transcodeResult = await this.imageTranscoder.transcode(
        localInputFilePath,
        localOutputDir,
      );

      const dstKey = this.generateDstKey(src.key);

      await this.uploadToS3(
        transcodeResult.outputPath,
        this.bucketName,
        dstKey,
      );

      const dst: AssetLocation = {
        bucket: this.bucketName,
        key: dstKey,
      };

      this.logger.log(`Successfully processed image: ${src.key} -> ${dstKey}`);

      return {
        uploadedKey: dstKey,
        dst,
      };
    } finally {
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

  private generateDstKey(srcKey: string): string {
    const ext = path.extname(srcKey);
    const baseName = path.basename(srcKey, ext);
    const dirName = path.dirname(srcKey);

    const dstKey = path.join(dirName, `${baseName}_transcoded.webp`);

    return dstKey;
  }
}