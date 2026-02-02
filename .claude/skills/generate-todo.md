# generate-todo

dev 브랜치와 sanguk 브랜치를 비교해서 다음 PR의 todo-list를 생성합니다.

## 사용법

```
/generate-todo [PR번호]
```

예시: `/generate-todo 2`

## 실행 절차

1. `git log dev..sanguk --oneline --reverse` 명령으로 dev에 없고 sanguk에 있는 커밋 목록을 확인한다

2. 첫 번째 커밋(또는 관련 커밋 그룹)을 분석해서 다음 PR에서 구현할 기능을 파악한다

3. `git show <커밋해시>` 로 변경된 파일과 코드를 확인한다

4. `docs/todo-list.md` 파일의 형식을 참고하여 `docs/todo-list-pr{번호}.md` 파일을 생성한다

## 생성할 파일 형식

`docs/todo-list.md`의 구조를 따른다:

```markdown
# PR #N: [기능 제목]

## 목표
[이 PR에서 구현할 내용 한 줄 설명]

---

## 사전 준비

### 1. 브랜치 생성
```bash
git checkout dev -b feature/[기능명]
```

### 2. 로컬 환경 실행
```bash
docker start mongo
pnpm run start:dev
```

---

## 알아야 할 개념

### [새로 배울 개념 1]
[개념 설명]

### [새로 배울 개념 2]
[개념 설명]

---

## 할 일

### 1. [할 일 제목]
[구체적인 구현 가이드]

### 2. [할 일 제목]
[구체적인 구현 가이드]

---

## 테스트 방법

```bash
pnpm run start:dev

curl -X [METHOD] http://localhost:3000/[endpoint] ...
```

---

## 완료 기준
- [ ] [체크 항목 1]
- [ ] [체크 항목 2]

---

## PR 올리기

```bash
git add .
git commit -m "[커밋 메시지]"
git push origin feature/[기능명]
gh pr create --base dev --title "[PR 제목]" --body "[설명]"
```

---

## 개발 종료 후 정리

```bash
docker stop mongo
```

---

## 셀프 체크리스트

PR 완료 후 아래 질문에 답할 수 있는지 확인해보세요.

### [카테고리]
- [ ] [질문 형태의 체크 항목]

---

## 참고 자료

- [링크 제목](URL)
```

## 주의사항

- 백엔드 개발을 처음 접하는 사람이 2-3일 안에 완료할 수 있는 분량으로 작성한다
- 새로 등장하는 개념은 "알아야 할 개념" 섹션에 간단히 설명한다
- "할 일"은 구체적인 힌트를 주되, 정답 코드를 그대로 주지 않는다
- "셀프 체크리스트"는 이 PR에서 배운 개념을 질문 형태로 작성한다
- sanguk 브랜치의 최종 코드와 정확히 일치할 필요는 없다
