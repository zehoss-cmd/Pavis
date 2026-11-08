# PAVIS

Patent Asset Valuation & Intelligence System. 특허 자산과 가치평가·라이선싱을 연결하기 위한 플랫폼으로, 현재 Phase 1 특허 자산 기반을 개발하고 있습니다.

## 현재 구현

- 이메일 회원가입·로그인·로그아웃 및 본인 전용 프로필
- 조직 생성, 멤버 역할·상태 관리, 최종 관리자 보호 및 관리자용 감사 이력 조회
- 이메일 인증된 계정의 조직 초대 등록·취소·수락. 초대는 7일 동안 유효하며 자동 이메일은 발송하지 않으므로 관리자가 PAVIS 주소를 직접 전달해야 합니다.
- 조직별 접근 통제와 프로필 보호를 위한 데이터베이스 RLS, GitHub 웹·DB 보안 테스트
- 조직별 특허 패밀리 생성, 특허 등록·수정·검색 및 변경 감사 이력. 임시 권한으로 활성 구성원은 조회하고 관리자와 IP 관리자는 등록·수정할 수 있습니다.

구성원 역할·상태의 변경 전후 값은 기능 적용 후 발생한 이력부터 기록됩니다. 이전 이력은 상세 값이 없습니다. 특허의 법적 상태는 사용자가 입력한 정보이며 자동 검증되지 않습니다. 업무별 상세 권한은 추후 운영정책에 따라 확정합니다. Supabase 기본 SMTP는 테스트용이므로 일반 외부 사용자에게 가입 인증 메일을 보내려면 별도 SMTP 설정이 필요합니다. 상세 정책과 보안 검토를 마치기 전에는 기밀 특허·협상 자료를 올리지 마세요.

설계 기준: [Master Blueprint](https://app.notion.com/p/4108cefac5ca81008655e8a10c460ef5), [시스템 아키텍처 초안](https://app.notion.com/p/4108cefac5ca8132aa06cb033c9ca309), [DB·ERD 초안](https://app.notion.com/p/4108cefac5ca814eb9b8cedd6a0d619b), [개발 현황](https://app.notion.com/p/4108cefac5ca81eb8b6dd37990fe5e93).

## 웹 실행 및 검사

Node.js 22 이상에서 `cd apps/web`, `npm ci`, `npm run dev`를 실행합니다. `apps/web/.env.example`을 `.env.local`로 복사한 뒤 Supabase URL과 publishable key, `PAVIS_SITE_URL`을 설정합니다. service role과 secret key는 클라이언트 변수나 Git에 저장하지 않습니다. 검증 명령은 `npm run lint`, `npx tsc --noEmit`, `npm run build`입니다.

## 로컬 데이터베이스 보안 테스트

Docker, PostgreSQL client (`psql`), Supabase CLI 2.122.1이 필요합니다. 저장소 루트에서 `supabase db start`, `supabase db reset --local --no-seed`, `bash scripts/test-db.sh`를 순서대로 실행합니다. **reset은 로컬 테스트 DB를 초기화해 그 안의 데이터를 삭제합니다.** 테스트는 `127.0.0.1:54322`에만 연결합니다. GitHub Actions는 새 DB에서 동일한 마이그레이션과 조직 격리·권한·동시성 테스트를 실행합니다.

## Vercel 배포 설정

Vercel의 Root Directory를 `apps/web`으로 설정하고 아래 환경변수를 지정합니다.

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key
- `PAVIS_SITE_URL`: 실제 HTTPS 배포 주소

Supabase Auth의 Site URL을 배포 주소로 설정하고 Redirect URLs에 `https://배포주소/auth/callback`을 추가합니다. 환경변수를 변경하면 재배포합니다. 초대 자동 발송을 지원하려면 별도 메일 발송 기능도 구현해야 합니다.

조직의 현재 화면 권한 기준은 `apps/web/src/domain/organizations/authorization.ts`에 있습니다. 이 기준은 화면/서버의 추가 검사이며 데이터베이스 RLS와 함수의 권한 검사를 대체하지 않습니다. 특허 권한은 임시 기준이며 평가·라이선싱 권한은 아직 확정되지 않았습니다. 웹 단위 테스트는 `cd apps/web && npm test`로 실행합니다.
