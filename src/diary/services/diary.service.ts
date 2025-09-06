import { Injectable } from '@nestjs/common';
import { CreateDiaryDto, DiaryResponse } from '../dto/diary.dto';
import { AuthPayload } from '../../auth/interfaces/auth.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Diary, DiaryDocument } from '../schema/diary.schema';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AssetLocation } from '../interfaces/diary.interface';

@Injectable()
export class DiaryService {
  constructor(
    @InjectModel(Diary.name) private readonly diaryModel: Model<DiaryDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(
    auth: AuthPayload,
    group: string,
    dto: CreateDiaryDto,
  ): Promise<DiaryResponse> {
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    const images =
      dto.imageKeys?.map((key) => ({
        src: {
          bucket: bucketName,
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

    return {
      _id: savedDiary._id,
    };
  }
}
