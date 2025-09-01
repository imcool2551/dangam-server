import { Injectable } from '@nestjs/common';
import { GroupCreateDto, GroupResponse } from '../dto/group.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Group, GroupDocument } from '../schemas/group.schema';
import { Model } from 'mongoose';
import { AccountRoles, AccountRolesDocument } from '../../account/schema/account-roles.schema';
import { AuthPayload } from '../../auth/auth.interface';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.name) private readonly groupModel: Model<GroupDocument>,
    @InjectModel(AccountRoles.name) private readonly accountRolesModel: Model<AccountRolesDocument>
  ) {}

  async create(auth: AuthPayload, dto: GroupCreateDto): Promise<GroupResponse> {
    // 1. 그룹 생성(create API 사용)
    // lastActivityAt 은 현재 unix timestamp 값(ms 단위). moment.valueOf()

    // 2. 그룹을 생성한 사람을 owner로 하는 AccountRoles 생성

    // 3. 생성된 그룹 응답
    throw 'TODO';
  }

  findMyGroup(auth: AuthPayload): Promise<GroupResponse[]> {
    // 1. aggregate API 사용
    // $match 로 auth.uid에 해당하는 AccountRoles 필터
    // $lookup 으로 Group 조인
    // $unwind로 group 펼치기
    // $project로 _id, group, role 선택
    // lastActivityAt 내림차순 정렬

    // 2. 2번 조회
    // AccountRoles 검색
    // Group id 추출
    // Group 검색
    // lastActivityAt 내림차순 정렬
    throw 'TODO'
  }
}
