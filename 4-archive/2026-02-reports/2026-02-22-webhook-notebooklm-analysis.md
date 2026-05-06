# 웹훅 404 에러 및 NotebookLM 통합 분석 리포트

## 📅 작성일: 2026-02-22

## 🔴 문제 요약

### 1. 웹훅 404 에러
- **현상**: `https://k.tess.dev/webhook` 및 `http://localhost:8080/webhook` 모두 404 반환
- **원인 분석**: 
  - 서버에 `/webhook` 경로가 존재하지 않음
  - 서버 바이너리 분석 결과 실제 경로는 `/kakao-talkchannel` 또는 별도의 라우트 사용

### 2. NotebookLM 인증 대기 중
- **현상**: `npx notebooklm login` 실행 후 사용자 브라우저 로그인 대기
- **상태**: Playwright 설치 완료, 인증 진행 중

---

## 🔍 서버 분석 결과

### Docker 컨테이너 상태
```
talkchannel-relay-app     Up 31 hours (healthy)  0.0.0.0:8080->8080/tcp
talkchannel-relay-postgres Up 31 hours (healthy)  5433->5432/tcp
talkchannel-relay-redis   Up 31 hours (healthy)  6379->6379
```

### 발견된 API 라우트
서버 바이너리(`strings`) 분석 결과:

| 경로 | 설명 |
|------|------|
| `/api/login` | 로그인 |
| `/api/logout` | 로그아웃 |
| `/api/stats` | 통계 |
| `/api/users/{id}` | 사용자 관리 |
| `/api/messages` | 메시지 |
| `/api/sessions/{id}` | 세션 관리 |
| `/api/connections` | 연결 관리 |
| `/api/pairing/generate` | 페어링 코드 생성 |
| `/api/token/regenerate` | 토큰 재생성 |
| `/kakao-talkchannel` | 카카오 웹훅 (추정) |

### 웹훅 관련 발견 사항
```
"received kakao webhook"
"invalid kakao webhook request"
"KAKAO_SIGNATURE_SECRET is empty in production: webhook signature verification disabled"
"/app/internal/handler/kakao.go"
"/app/internal/handler/openclaw.go"
```

---

## 💡 해결 방안

### 방안 1: 카카오 챗봇 설정 확인
카카오 챗봇 관리자 페이지에서 웹훅 URL을 확인:
- 현재 설정: `https://k.tess.dev/webhook`
- 올바른 설정: `https://k.tess.dev/kakao-talkchannel` 또는 서버 실제 경로

### 방안 2: k.tess.dev DNS/프록시 확인
```
k.tess.dev → 404 (웹훅 경로 없음)
k.tess.dev/portal/ → 정상 (포털 페이지 존재)
```
- nginx/프록시 설정에서 `/webhook` → `localhost:8080/kakao-talkchannel` 매핑 필요

### 방안 3: 웹훅 엔드포인트 추가
서버 소스 코드에 `/webhook` 라우트 추가 필요

---

## 📋 NotebookLM 통합 가이드

### 설치 완료
```bash
npm install -g notebooklm@0.1.1
npx playwright install chromium
```

### 인증 방법
```bash
npx notebooklm login
```
브라우저에서 Google 계정 로그인 후 터미널에서 Enter

### CLI 사용법
```bash
# 노트북 목록
npx notebooklm list

# 노트북 생성
npx notebooklm create "OpenClaw Research"

# 질문하기
npx notebooklm ask <notebook-id> "What is the main topic?"

# 소스 추가
npx notebooklm source add <notebook-id> https://example.com
```

### API 사용 (TypeScript)
```typescript
import { NotebookLMClient } from 'notebooklm';

const client = await NotebookLMClient.fromStorage();
const notebooks = await client.notebooks.list();
const response = await client.chat.ask(notebookId, '질문 내용');
```

---

## 🎯 다음 단계

### 즉시 실행
1. **NotebookLM 인증 완료**: 브라우저에서 로그인 완료 후 터미널에서 Enter
2. **k.tess.dev 프록시 설정 확인**: 웹훅 경로 매핑

### 추가 조사
1. 웹훅 서버 소스 코드 위치 확인
2. k.tess.dev DNS/프록시 서버 설정 확인
3. 카카오 챗봇 스킬 설정 재확인

---

## 📎 참고 자료

- NotebookLM npm: https://npm.im/notebooklm
- NotebookLM MCP Server: https://npm.im/notebooklm-mcp-server
- GitHub: https://github.com/kaelen/notebooklm