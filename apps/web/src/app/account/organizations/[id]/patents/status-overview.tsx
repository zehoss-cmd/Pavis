import Link from 'next/link';
import { patentStatuses } from '@/lib/patents/search';
import { statusLabels } from './form-data';

export type PatentStatusCounts = { total:number; byStatus:Record<string,number> };

export function PatentStatusOverview({counts,activeStatus}:{counts:PatentStatusCounts;activeStatus:string}) {
 return <section className="patent-status-overview" aria-labelledby="patent-status-title">
  <div className="patent-status-heading"><div><h2 id="patent-status-title">특허 현황</h2><p>이 조직에 등록된 전체 특허 기준 · 입력된 법적 상태</p></div></div>
  <div className="patent-status-grid">
   <Link href="?" className="patent-status-tile" aria-current={!activeStatus?'true':undefined}><span>전체</span><strong>{counts.total.toLocaleString('ko-KR')}<small>건</small></strong></Link>
   {patentStatuses.map(status=><Link href={`?status=${encodeURIComponent(status)}`} key={status} className="patent-status-tile" aria-current={activeStatus===status?'true':undefined}><span>{statusLabels[status]}</span><strong>{(counts.byStatus[status]??0).toLocaleString('ko-KR')}<small>건</small></strong></Link>)}
  </div>
  <p className="patent-status-note">상태를 선택하면 다른 검색 조건은 초기화됩니다. 법적 상태는 공식 출처에서 확인해 주세요.</p>
 </section>;
}
