# PAVIS

Patent Asset Valuation & Intelligence System. Phase 0 개발 기반 및 온보딩 소개 화면입니다.

## 실행

Node.js 22 이상에서 `cd apps/web`, `npm ci`, `npm run dev`를 실행합니다. 검증은 `npm run lint`, `npx tsc --noEmit`, `npm run build`로 수행합니다.

## 현재 상태

소개 화면과 웹 프로젝트 기반을 구성 중입니다. 회원가입, 로그인, 조직 격리 및 데이터베이스는 아직 연결되지 않았습니다. 이 화면을 인증 완료된 서비스로 사용하지 마세요.

기준 설계: [Master Blueprint](https://app.notion.com/p/4108cefac5ca81008655e8a10c460ef5), [아키텍처](https://app.notion.com/p/4108cefac5ca8132aa06cb033c9ca309), [DB 및 ERD](https://app.notion.com/p/4108cefac5ca814eb9b8cedd6a0d619b).

## Supabase 인증 설정

`apps/web/.env.example`을 `.env.local`로 복사하고 Supabase 프로젝트 URL과 publishable key를 설정합니다. 서버 비밀키는 사용하지 않습니다. `PAVIS_SITE_URL`을 실제 서비스 주소로 설정하고 Supabase Auth의 Site URL과 허용 Redirect URL에 해당 주소의 `/auth/callback`을 등록해야 합니다. 운영 환경에서는 HTTPS만 허용합니다. 이메일 확인 링크와 회원가입·로그인 전 과정은 실제 메일 환경에서 검증해야 합니다. 조직, 멤버십, RLS 및 감사 기능은 아직 구현되지 않았으므로 실제 기밀 데이터를 저장해서는 안 됩니다.

## 조직 기반 (Phase 0C)

조직과 최초 관리자 멤버십, 조직 생성 감사 이벤트를 원자적으로 생성합니다. 사용자는 자신의 활성 멤버십에 연결된 조직을 조회하며, 관리자는 해당 조직의 감사 기록을 조회합니다. 조직·멤버십 수정, 초대 및 삭제는 아직 제공하지 않습니다. 마이그레이션은 `supabase/migrations`, 롤백되는 격리 검증은 `supabase/tests/organization_isolation.sql`을 참고하세요. 이메일 인증 전체 흐름과 실제 브라우저 테스트는 아직 필요합니다.
