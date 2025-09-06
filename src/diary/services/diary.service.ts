import { Injectable, Logger } from '@nestjs/common';
import { CreateDiaryDto, DiaryResponse } from '../dto/diary.dto';
import { AuthPayload } from '../../auth/interfaces/auth.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AssetLocation } from '../interfaces/diary.interface';
import { DiaryImageProcessingService } from './diary-image-processing.service';

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);
  private readonly bucketName: string;

  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
    private readonly configService: ConfigService,
    private readonly diaryImageProcessingService: DiaryImageProcessingService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
  }

  async create(
    auth: AuthPayload,
    group: string,
    dto: CreateDiaryDto,
  ): Promise<DiaryResponse> {
    const images =
      dto.imageKeys?.map((key) => ({
        src: {
          bucket: this.bucketName,
          key: key,
        } as AssetLocation,
      })) || [];

    const diary = new this.diaryModel({
      title: dto.title,
      content: dto.content,
      images: images,
      account: auth.uid,
      group: group,
      deleted: false,
    });

    const savedDiary = await diary.save();

    // Trigger async image transcoding (fire and forget)
    if (savedDiary.images.length > 0) {
      this.diaryImageProcessingService
        .processAllImages(savedDiary._id)
        .catch((error) => {
          this.logger.error(
            `Failed to process images for diary ${savedDiary._id}`,
            error,
          );
        });
    }

    return {
      _id: savedDiary._id,
    };
  }
}
