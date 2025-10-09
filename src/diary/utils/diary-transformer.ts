import { DiaryDocument } from '../schema/diary.schema';
import { DiaryResponse } from '../dto/diary.dto';
import { AccountDocument } from '../../account/schema/account.schema';

export type PopulatedDiaryDocument = Omit<DiaryDocument, 'account'> & {
  account: AccountDocument | string;
};

export function toDiaryResponse(diary: PopulatedDiaryDocument): DiaryResponse {
  const account = diary.account;
  const accountUid = typeof account === 'string' ? account : account._id;
  const displayName = typeof account === 'string' ? '' : account.displayName;

  return {
    _id: diary._id,
    title: diary.title,
    content: diary.content,
    images: diary.images,
    account: accountUid,
    displayName: displayName,
    createdAt: diary.createdAt.getTime(),
    updatedAt: diary.updatedAt.getTime(),
  };
}
