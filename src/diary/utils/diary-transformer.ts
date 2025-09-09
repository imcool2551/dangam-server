import { DiaryDocument } from '../schema/diary.schema';
import { DiaryResponse } from '../dto/diary.dto';

export function toDiaryResponse(diary: DiaryDocument): DiaryResponse {
  return {
    _id: diary._id,
    title: diary.title,
    content: diary.content,
    images: diary.images,
    createdAt: diary.createdAt.getTime(),
    updatedAt: diary.updatedAt.getTime(),
  };
}
