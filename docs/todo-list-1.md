# PR #1: Group 생성 기능 완성

## 목표
Initial commit에 있는 `GroupService.create()` TODO를 구현합니다.

---

## 사전 준비

### 1. pnpm 설치
```bash
# npm으로 설치 (Node.js가 설치되어 있어야 함)
npm install -g pnpm

# 또는 corepack 사용 (Node.js 16.13 이상)
corepack enable
corepack prepare pnpm@latest --activate

# 설치 확인
pnpm --version
```

### 2. Docker 설치
```bash
# macOS: Docker Desktop 설치
# https://www.docker.com/products/docker-desktop/ 에서 다운로드

# 설치 확인
docker --version
```

### 3. 브랜치 생성
```bash
git checkout dev
git pull origin dev
git checkout -b feature/group-create
```

### 4. 로컬 환경 실행
```bash
pnpm install
docker run -d -p 27017:27017 --name mongo mongo:latest
cp .env.example .env  # DB_URI=mongodb://localhost:27017/dangam
pnpm run start:dev
```

---

## 알아야 할 개념

### Docker (컨테이너)
프로그램을 **격리된 환경(컨테이너)**에서 실행하는 도구입니다. MongoDB를 직접 설치하지 않고 Docker로 실행하면 환경 설정이 간편합니다.

**핵심 개념**
- **Image**: 프로그램 템플릿 (예: `mongo:latest`)
- **Container**: Image를 실행한 인스턴스 (실제 돌아가는 프로세스)
- **Volume**: 컨테이너의 데이터를 저장하는 공간 (컨테이너 삭제해도 데이터 유지 가능)

**자주 쓰는 명령어**
```bash
docker run -d --name mongo mongo:latest  # 컨테이너 생성 및 실행
docker ps                                 # 실행 중인 컨테이너 목록
docker stop mongo                         # 컨테이너 중지
docker start mongo                        # 중지된 컨테이너 재시작
docker rm mongo                           # 컨테이너 삭제
```

### pnpm (패키지 매니저)
Node.js 프로젝트의 라이브러리(패키지)를 관리하는 도구입니다. npm, yarn과 같은 역할을 합니다.

**왜 pnpm을 쓰나요?**
- **빠름**: 패키지를 한 번만 다운로드하고 여러 프로젝트에서 공유
- **디스크 절약**: 중복 설치 없이 심볼릭 링크 사용
- **엄격함**: 선언하지 않은 패키지는 사용 불가 (실수 방지)

**자주 쓰는 명령어**
```bash
pnpm install          # package.json의 모든 패키지 설치
pnpm add <패키지>      # 새 패키지 추가
pnpm add -D <패키지>   # 개발용 패키지 추가 (devDependencies)
pnpm run <스크립트>    # package.json의 scripts 실행
pnpm run start:dev    # 개발 서버 실행
```

### NestJS 모듈 구조
NestJS는 기능별로 **Module**을 나눕니다. 각 모듈은 보통 이렇게 구성됩니다:
- **Controller**: HTTP 요청을 받는 곳 (`@Get()`, `@Post()` 등)
- **Service**: 비즈니스 로직을 처리하는 곳
- **Schema**: MongoDB 문서 구조 정의

```
src/group/
├── group.module.ts          # 모듈 정의
├── controllers/
│   └── group.controller.ts  # HTTP 요청 처리
├── services/
│   └── group.service.ts     # 비즈니스 로직
└── schemas/
    └── group.schema.ts      # DB 스키마
```

### Mongoose & MongoDB
- **Schema**: 문서의 구조를 정의 (어떤 필드가 있는지)
- **Model**: Schema를 기반으로 CRUD 작업을 수행
- **Document**: 실제 저장된 데이터 하나

```typescript
// Schema 정의 예시
@Schema()
export class Group {
  @Prop() displayName: string;
}

// Service에서 사용
const group = await this.groupModel.create({ displayName: 'My Group' });
```

### nanoid
고유한 ID를 생성하는 라이브러리입니다. MongoDB의 ObjectId 대신 사용합니다.
```typescript
import { nanoid } from 'nanoid';
const id = nanoid(16);  // "V1StGXR8_Z5jdHi6"
```

---

## 할 일

### 1. nanoid 설치
```bash
pnpm add nanoid@3
```

### 2. Account 스키마 생성

`src/account/` 폴더를 만들고 스키마를 정의합니다.

**`src/account/schema/account.schema.ts`**
```typescript
// 사용자 정보를 저장하는 스키마
// 필드: _id, ssoType, ssoId, displayName, deleted, createdAt, updatedAt
```

**`src/account/schema/account-roles.schema.ts`**
```typescript
// 사용자가 어떤 그룹에서 어떤 역할인지 저장
// 필드: _id, account(사용자ID), group(그룹ID), role(권한숫자)
```

### 3. 임시 인증 처리

인증 기능은 나중에 구현합니다. 지금은 헤더에서 userId를 받아서 사용합니다.

**Controller 수정**
```typescript
@Post()
create(
  @Headers('x-user-id') userId: string,  // 임시: 헤더에서 userId 받기
  @Body() dto: GroupCreateDto,
): Promise<GroupResponse> {
  return this.groupService.create(userId, dto);
}
```

### 4. GroupService.create() 구현

`src/group/services/group.service.ts`의 TODO를 구현합니다:

```typescript
async create(userId: string, dto: GroupCreateDto): Promise<GroupResponse> {
  // 1. 그룹 생성
  //    - _id: nanoid(16)
  //    - displayName: dto에서 받음
  //    - inviteToken: nanoid(16)
  //    - lastActivityAt: moment().valueOf()

  // 2. AccountRoles 생성
  //    - account: userId  (헤더에서 받은 값)
  //    - group: 방금 만든 그룹 _id
  //    - role: 700 (owner)

  // 3. 생성된 그룹 정보 반환
}
```

---

## 테스트 방법

```bash
# 서버 실행
pnpm run start:dev

# API 테스트 (다른 터미널에서)
# x-user-id 헤더로 임시 사용자 ID 전달
curl -X POST http://localhost:3000/group \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-001" \
  -d '{"displayName": "우리 가족"}'
```

---

## 완료 기준
- [ ] `POST /group` 호출 시 그룹이 DB에 저장됨
- [ ] AccountRoles 컬렉션에 owner 레코드가 생성됨
- [ ] 생성된 그룹 정보가 응답으로 반환됨

---

## PR 올리기

```bash
git add .
git commit -m "feat: implement group create"
git push origin feature/group-create
gh pr create --title "feat: Group 생성 기능 구현" --body "GroupService.create() TODO 구현"
```

---

## 개발 종료 후 정리

### 서버 종료
터미널에서 `Ctrl + C`로 NestJS 서버를 종료합니다.

### Docker 컨테이너 관리

```bash
# 컨테이너 중지 (데이터 유지됨)
docker stop mongo

# 다음에 개발할 때 다시 시작
docker start mongo
```

### 데이터(Volume) 관리

```bash
# 데이터 유지하면서 컨테이너만 삭제
docker stop mongo
docker rm mongo
# → 다음에 같은 이름으로 run하면 데이터 사라짐 (Volume 미지정시)

# 데이터를 유지하려면 Volume을 명시적으로 지정
docker run -d -p 27017:27017 --name mongo -v mongo-data:/data/db mongo:latest
# → mongo-data라는 Volume에 데이터 저장됨

# 데이터 완전 초기화 (처음부터 다시 시작하고 싶을 때)
docker stop mongo
docker rm mongo
docker volume rm mongo-data  # Volume도 삭제
```

---

## 셀프 체크리스트

PR 완료 후 아래 질문에 답할 수 있는지 확인해보세요.

### Docker
- [ ] Docker Image와 Container의 차이를 설명할 수 있다
- [ ] `docker run`, `docker stop`, `docker start`의 차이를 안다
- [ ] Volume이 왜 필요한지 설명할 수 있다

### pnpm / npm
- [ ] `pnpm install`이 하는 일을 설명할 수 있다
- [ ] `pnpm add`와 `pnpm add -D`의 차이를 안다
- [ ] `package.json`의 역할을 설명할 수 있다

### NestJS
- [ ] Controller, Service, Module의 역할을 각각 설명할 수 있다
- [ ] Controller에서 Service를 어떻게 사용하는지 안다 (Dependency Injection)
- [ ] `@Post()`, `@Body()` 데코레이터가 하는 일을 안다

### Mongoose & MongoDB
- [ ] Schema가 무엇인지 설명할 수 있다
- [ ] `@Schema()`, `@Prop()` 데코레이터의 역할을 안다
- [ ] `this.model.create()`가 무엇을 하는지 안다
- [ ] MongoDB에서 Document가 무엇인지 안다

### Git
- [ ] `git checkout -b`가 하는 일을 안다
- [ ] `git add`, `git commit`, `git push`의 흐름을 설명할 수 있다
- [ ] PR(Pull Request)이 무엇인지 설명할 수 있다

### 코드 이해
- [ ] 내가 작성한 코드가 어떤 순서로 실행되는지 설명할 수 있다
- [ ] API 요청이 들어왔을 때 Controller → Service → DB 흐름을 설명할 수 있다

---

## 참고 자료

- [Docker Desktop 설치](https://www.docker.com/products/docker-desktop/)
- [Docker 기초 가이드](https://docs.docker.com/get-started/)
- [pnpm 설치 가이드](https://pnpm.io/installation)
- [NestJS 첫 걸음](https://docs.nestjs.com/first-steps)
- [NestJS + Mongoose](https://docs.nestjs.com/techniques/mongodb)
- [Mongoose Schema 정의](https://mongoosejs.com/docs/guide.html)
- [nanoid 사용법](https://github.com/ai/nanoid)
