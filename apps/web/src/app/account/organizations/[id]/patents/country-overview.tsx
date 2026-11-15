import Link from 'next/link';
import type { CountryCount } from '@/lib/patents/country-overview';

export function PatentCountryOverview({countries,sampleCount,totalCount,activeCountry}:{countries:CountryCount[];sampleCount:number;totalCount:number;activeCountry:string}) {
 const visible=countries.slice(0,10), remaining=countries.slice(10);
 const rest=remaining.reduce((total,country)=>total+country.count,0);
 const partial=sampleCount<totalCount;
 return <section className="patent-country-overview" aria-labelledby="patent-country-title">
  <h2 id="patent-country-title">국가별 특허 현황</h2>
  <p>{partial?`전체 ${totalCount.toLocaleString('ko-KR')}건 중 최근 등록 ${sampleCount.toLocaleString('ko-KR')}건 기준`:`이 조직에 등록된 전체 ${totalCount.toLocaleString('ko-KR')}건 기준`}</p>
  {sampleCount===0?<p>등록된 특허가 없습니다.</p>:<><ul className="patent-country-list">{visible.map(({country,count})=><li key={country}><Link href={`?country=${encodeURIComponent(country)}`} aria-current={activeCountry===country?'true':undefined}><span className="patent-country-label">{country}</span><span className="patent-country-bar" aria-hidden="true"><span style={{width:`${count/sampleCount*100}%`}}/></span><span className="patent-country-count">{count.toLocaleString('ko-KR')}건 · {(count/sampleCount*100).toFixed(1)}%</span></Link></li>)}</ul>{remaining.length>0&&<p>그 외 {remaining.length.toLocaleString('ko-KR')}개 국가 · {rest.toLocaleString('ko-KR')}건</p>}</>}
  <p className="patent-country-note">{partial?'표시 범위 밖의 특허는 국가별 건수와 비율에 포함되지 않습니다. ':''}국가를 선택하면 다른 검색 조건은 초기화됩니다. 등록된 국가 코드를 기준으로 합니다.</p>
 </section>;
}
