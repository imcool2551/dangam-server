# PR #2: 내 그룹 목록 조회 & 그룹 수정

## 목표
`findMyGroup()`과 `updateGroup()` TODO를 구현합니다.

---

## 사전 준비

### 1. 브랜치 생성
```bash
git checkout dev
git pull origin dev
git checkout -b feature/group-find-update
```

### 2. 로컬 환경 실행
```bash
docker start mongo  # 이미 실행 중이면 생략
pnpm run start:dev
```

---

## 알아야 할 개념

### Mongoose find / findById
MongoDB에서 문서를 조회하는 기본 메서드입니다.

```typescript
// 조건에 맞는 모든 문서 조회
const roles = await this.accountRolesModel.find({ account: 'user123' });

// ID로 단일 문서 조회
const group = await this.groupModel.findById('groupId123');

// 여러 ID로 조회
const groups = await this.groupModel.find({ _id: { $in: ['id1', 'id2'] } });
```

### Mongoose 수정 방법

```typescript
// 방법 1: findByIdAndUpdate (한 번에 조회 + 수정)
const updated = await this.groupModel.findByIdAndUpdate(
  groupId,
  { displayName: 'New Name' },
  { new: true }  // 수정된 문서 반환 (없으면 수정 전 문서 반환)
);

// 방법 2: 조회 후 save (두 단계)
const group = await this.groupModel.findById(groupId);
group.displayName = 'New Name';
await group.save();
```

### NestJS 예외 처리
NestJS는 내장 예외 클래스를 제공합니다.

```typescript
import { NotFoundException } from '@nestjs/common';

// 404 Not Found
if (!group) {
  throw new NotFoundException('그룹을 찾을 수 없습니다');
}
```

---

## 할 일

### 1. GET /group 엔드포인트 수정

`src/group/controllers/group.controller.ts`에서 임시로 헤더에서 userId를 받도록 합니다.

```typescript
@Get()
findMyGroup(@Headers('x-user-id') userId: string): Promise<GroupResponse[]> {
  return this.groupService.findMyGroup(userId);
}
```

### 2. findMyGroup() 구현

`src/group/services/group.service.ts`의 TODO를 구현합니다.

```typescript
async findMyGroup(userId: string): Promise<GroupResponse[]> {
  // 1. AccountRoles에서 내 그룹 ID 목록 조회
  //    - account가 userId인 레코드들 찾기

  // 2. 그룹 ID 배열 추출
  //    - roles.map(r => r.group)

  // 3. Group 컬렉션에서 해당 ID들 조회
  //    - find({ _id: { $in: groupIds } })

  // 4. lastActivityAt 내림차순 정렬 후 반환
}
```

### 3. updateGroup() 구현

```typescript
async updateGroup(group: string, dto: GroupUpdateDto): Promise<GroupResponse> {
  // 1. group ID로 그룹 조회

  // 2. 없으면 NotFoundException throw

  // 3. dto의 값으로 수정 (displayName 등)

  // 4. 저장 후 반환
}
```

---

## 테스트 방법

```bash
# 서버 실행
pnpm run start:dev

# 1. 먼저 그룹 생성 (PR #1에서 구현)
curl -X POST http://localhost:3000/group \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-001" \
  -d '{"displayName": "테스트 그룹"}'

# 2. 내 그룹 목록 조회
curl -X GET http://localhost:3000/group \
  -H "x-user-id: test-user-001"

# 3. 그룹 수정
curl -X PUT http://localhost:3000/group/{groupId} \
  -H "Content-Type: application/json" \
  -d '{"displayName": "수정된 이름"}'
```

---

## 완료 기준
- [ ] `GET /group` 호출 시 내가 속한 그룹 목록이 반환됨
- [ ] 그룹 목록이 lastActivityAt 내림차순으로 정렬됨
- [ ] `PUT /group/:group` 호출 시 그룹 정보가 수정됨
- [ ] 존재하지 않는 그룹 수정 시 404 에러 반환

---

## PR 올리기

```bash
git add .
git commit -m "feat: implement findMyGroup and updateGroup"
git push origin feature/group-find-update
gh pr create --base dev --title "feat: 내 그룹 조회 및 수정 구현" --body "findMyGroup(), updateGroup() TODO 구현"
```

---

## 개발 종료 후 정리

```bash
docker stop mongo
```

---

## 셀프 체크리스트

PR 완료 후 아래 질문에 답할 수 있는지 확인해보세요.

### HTTP 기초
- [ ] GET과 POST의 차이를 설명할 수 있다
- [ ] PUT과 PATCH의 차이를 설명할 수 있다
- [ ] HTTP 상태 코드 200, 201, 400, 404의 의미를 안다
- [ ] "Content-Type: application/json"이 무엇인지 안다

### Mongoose
- [ ] `find()`와 `findById()`의 차이를 안다
- [ ] `{ $in: [...] }` 연산자가 무엇인지 안다
- [ ] `findByIdAndUpdate()`의 `{ new: true }` 옵션이 무엇인지 안다

### NestJS
- [ ] `@Get()`, `@Put()`, `@Param()` 데코레이터의 역할을 안다
- [ ] `NotFoundException`을 언제 사용하는지 안다

### 코드 이해
- [ ] 두 컬렉션(AccountRoles, Group)의 관계를 설명할 수 있다
- [ ] 왜 2번 조회가 필요한지 설명할 수 있다

---

## Advanced: Aggregate로 구현하기 (선택)

2번 조회 대신 MongoDB Aggregate를 사용하면 한 번의 쿼리로 처리할 수 있습니다.

```typescript
const result = await this.accountRolesModel.aggregate([
  { $match: { account: auth.uid } },        // 1. 내 권한만 필터
  { $lookup: {                               // 2. Group 조인
      from: 'groups',
      localField: 'group',
      foreignField: '_id',
      as: 'groupInfo'
  }},
  { $unwind: '$groupInfo' },                 // 3. 배열 펼치기
  { $sort: { 'groupInfo.lastActivityAt': -1 }} // 4. 정렬
]);
```

**Aggregate 주요 스테이지**
- `$match`: 조건 필터 (WHERE)
- `$lookup`: 다른 컬렉션 조인 (JOIN)
- `$unwind`: 배열을 개별 문서로 펼침
- `$sort`: 정렬

---

## 참고 자료

- [HTTP 요청 메서드 (MDN)](https://developer.mozilla.org/ko/docs/Web/HTTP/Methods)
- [HTTP 상태 코드 (MDN)](https://developer.mozilla.org/ko/docs/Web/HTTP/Status)
- [Mongoose Queries](https://mongoosejs.com/docs/queries.html)
- [Mongoose findByIdAndUpdate](https://mongoosejs.com/docs/api/model.html#Model.findByIdAndUpdate())
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [MongoDB Aggregation](https://www.mongodb.com/docs/manual/aggregation/) (Advanced)
