import { LoadError } from '@/components/load-error';
import type { createClient } from '@/lib/supabase/server';
import { countValue } from '@/domain/workspace/asset-overview';

export async function AssetOverview({supabase}:{supabase:Awaited<ReturnType<typeof createClient>>}) {
 const [patents,products,links,missing]=await Promise.all([
  supabase.from('patent_assets').select('id',{count:'exact',head:true}),
  supabase.from('product_assets').select('id',{count:'exact',head:true}),
  supabase.from('product_patent_links').select('id',{count:'exact',head:true}),
  supabase.from('product_assets').select('id',{count:'exact',head:true}).is('revenue_amount',null),
 ]);
 const metrics=[{label:'특허 자산',count:countValue(patents),unit:'건',description:'등록된 특허'},
  {label:'제품 자산',count:countValue(products),unit:'개',description:'등록된 제품'},
  {label:'제품·특허 연결',count:countValue(links),unit:'건',description:'제품과 특허의 연결 관계'},
  {label:'매출 미입력 제품',count:countValue(missing),unit:'개',description:'기준연도와 매출액 미입력'}];
 return <section className="panel asset-overview" aria-labelledby="asset-overview-title"><div className="asset-overview-heading"><div><h2 id="asset-overview-title">내 자산 현황</h2><p>접근할 수 있는 전체 조직의 자산을 합산한 현황입니다.</p></div><a className="asset-overview-link" href="#organizations">조직별 자산 보기</a></div><div className="asset-overview-grid">{metrics.map(metric=><div className="asset-overview-stat" key={metric.label}><span>{metric.label}</span><strong>{metric.count===null?'확인 불가':<>{new Intl.NumberFormat('ko-KR').format(metric.count)}<small> {metric.unit}</small></>}</strong><small>{metric.description}</small></div>)}</div>{metrics.some(metric=>metric.count===null)&&<LoadError message="일부 자산 현황을 불러오지 못했습니다."/>}<p>연결 수는 제품과 특허 사이의 관계 수입니다. 매출 미입력은 기준연도에 관계없이 매출액이 없는 제품이며, 삭제된 자산은 포함하지 않습니다.</p></section>;
}
