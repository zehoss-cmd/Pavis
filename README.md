# PAVIS

Patent Asset Valuation & Intelligence System. Phase 0 개발 기반 및 온보딩 소개 화면입니다.

## 실행

Node.js 22 이상에서 `cd apps/web`, `npm ci`, `npm run dev`를 실행합니다. 검증은 `npm run lint`, `npx tsc --noEmit`, `npm run build`로 수행합니다.

## 현재 상태

소개 화면과 웹 프로젝트 기반을 구성 중입니다. 회원가입, 로그인, 조직 격리 및 데이터베이스는 아직 연결되지 않았습니다. 이 화면을 인증 완료된 서비스로 사용하지 마세요.

기준 설계: [Master Blueprint](https://app.notion.com/p/4108cefac5ca81008655e8a10c460ef5), [아키텍처](https://app.notion.com/p/4108cefac5ca8132aa06cb033c9ca309), [DB 및 ERD](https://app.notion.com/p/4108cefac5ca814eb9b8cedd6a0d619b).

## Supabase 인증 설정

`apps/web/.env.example`을 `.env.local`로 복사하고 Supabase 프로젝트 URL과 publishable key를 설정합니다. 서버 비밀키는 사용하지 않습니다. Supabase Auth의 Site URL과 허용된 Redirect URL은 실제 실행 주소에 맞춰 설정해야 합니다. 이메일 확인 링크와 회원가입·로그인 전 과정은 실제 메일 환경에서 검증해야 합니다. 조직, 멤버십, RLS 및 감사 기능은 아직 구현되지 않았으므로 실제 기밀 데이터를 저장해서는 안 됩니다.
