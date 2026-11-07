import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const labels: Record<string, string> = {
  'organization.created': '조직 생성',
  'organization.member.updated': '구성원 권한 또는 상태 변경',
};
type Member = { user_id: string; email: string | null };

export default async function AuditPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  if (!uuid.test(id)) notFound();
  const supabase = await createClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  const {data:membership} = await supabase.from('organization_members').select('role').eq('organization_id',id).eq('user_id',user.id).maybeSingle();
  if (membership?.role !== 'admin') notFound();
  const [{data:organization},{data:entries,error:logError},{data:memberData,error:memberError}] = await Promise.all([
    supabase.from('organizations').select('name').eq('id',id).maybeSingle(),
    supabase.from('audit_logs').select('id,actor_user_id,action,target_id,occurred_at').eq('organization_id',id).order('occurred_at',{ascending:false}).order('id',{ascending:false}).limit(50),
    supabase.rpc('list_organization_members',{p_org:id}),
  ]);
  if (!organization) notFound();
  const members = (memberData || []) as Member[];
  const memberName = (memberId: string | null) => memberId === user.id ? '나' : members.find(member => member.user_id === memberId)?.email || '확인할 수 없는 사용자';
  return <main className="auth-page"><Link href="/account" className="logo">◈ <span>PAVIS</span></Link><div className="auth-card"><p className="eyebrow">AUDIT HISTORY</p><h1>활동 이력</h1><p>{organization.name} · 최근 50건</p><p>조직 생성과 구성원 권한 변경을 확인할 수 있습니다.</p>{(logError || memberError) ? <p className="form-message" role="alert">이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p> : entries?.length ? <ul className="audit-list">{entries.map(entry=><li key={entry.id}><strong>{labels[entry.action] || '기타 조직 활동'}</strong><span>{memberName(entry.actor_user_id)}{entry.action === 'organization.member.updated' ? ` → ${memberName(entry.target_id)}` : ''}</span><time dateTime={entry.occurred_at}>{new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(entry.occurred_at))} (한국 시간)</time></li>)}</ul> : <p>아직 기록된 활동이 없습니다.</p>}<Link href={`/account/organizations/${id}`}>← 조직 관리로</Link></div></main>;
}
