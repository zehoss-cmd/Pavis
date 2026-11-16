import { SubmitButton } from '@/components/submit-button';

export function OrganizationCreate({ action }: { action: (form: FormData) => void | Promise<void> }) {
  return <details className="organization-create"><summary>새 조직 만들기</summary><form action={action}><label>조직 이름<input name="name" minLength={1} maxLength={120} placeholder="예: PAVIS 연구소" required /></label><SubmitButton>조직 만들기</SubmitButton></form></details>;
}
