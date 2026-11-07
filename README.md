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

## Vercel 배포 설정

Vercel에서 `zehoss-cmd/Pavis` 저장소를 가져오고 Root Directory를 `apps/web`으로 지정합니다. Next.js 프레임워크를 선택하고 다음 환경변수를 설정합니다.

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key
- `PAVIS_SITE_URL`: 실제 배포 HTTPS 주소 (끝에 경로 없이 입력)

Supabase Authentication의 URL Configuration에서 Site URL을 배포 주소로 설정하고, Redirect URLs에 `https://배포주소/auth/callback`을 추가합니다. 배포 주소가 확정된 후 `PAVIS_SITE_URL`을 설정하고 다시 배포합니다. 이메일 확인부터 로그인, 조직 생성과 로그아웃까지 실제 환경에서 검증해야 합니다. service role 또는 secret key를 브라우저 환경변수에 넣지 않습니다.

조직 관리자 화면에서 기존 구성원의 역할과 활성 상태를 변경할 수 있습니다. 데이터베이스에서 관리자 권한을 확인하고 마지막 활성 관리자를 보호하며 변경을 감사 기록에 남깁니다. 구성원 초대 및 이메일 발송은 아직 구현되지 않았습니다. 권한 회귀 검증 SQL은 `supabase/tests/membership_admin.sql`에 있습니다.

## 로컬 데이터베이스 보안 테스트

Docker, PostgreSQL client (`psql`), Supabase CLI 2.122.1이 필요합니다. 저장소 루트에서 `supabase db start`, `supabase db reset --local --no-seed`, `bash scripts/test-db.sh`를 순서대로 실행합니다. 이 명령은 로컬 Supabase DB를 초기화하므로 로컬 테스트 데이터를 지웁니다. 테스트는 로컬 `127.0.0.1:54322`에만 연결하고 각 시나리오의 데이터를 롤백합니다. CI도 동일한 절차를 새 데이터베이스에서 실행합니다.

내 프로필에서 표시 이름을 설정할 수 있습니다. 프로필은 본인만 조회·수정하며 조직 멤버에게 자동으로 공개되지 않습니다. 구성원 초대는 보류 중입니다.

조직 관리자는 조직 상세의 활동 이력에서 최근 50건의 조직 생성 및 구성원 권한·상태 변경을 확인할 수 있습니다. 현재 기록은 변경 전후 값까지 저장하지 않습니다.

조직 관리자는 구성원 화면에서 이메일과 역할을 지정해 초대를 등록하거나 취소할 수 있습니다. 초대는 7일 동안 유효하며, 해당 이메일을 인증한 계정이 로그인 후 계정 화면에서 직접 수락합니다. 관리자는 초대 등록 후 PAVIS 주소를 상대방에게 직접 알려야 하며, 초대 메일은 자동 발송되지 않습니다. 기존 비활성 멤버의 재활성화와 관리자 권한 부여는 관리자 구성원 관리에서 처리합니다.
