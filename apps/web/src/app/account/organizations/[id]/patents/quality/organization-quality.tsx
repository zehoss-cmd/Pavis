'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation-link';
import { patentQualityRules } from '@/domain/patents/quality';
import { pageSize } from '@/lib/patents/search';

type Finding = {id:string; title:string|null; jurisdiction:string|null; number:string|null; rules:number[]};
type Batch = {started:string; today:string; scanned:number; findings:Finding[]; next:string|null};
type Scan =
  | {status:'loading'; scanned:number}
  | {status:'error'}
  | {status:'done'; scanned:number; today:string; findings:Finding[]; counts:Map<number,number>; total:number};

function scanQuery(rule:number, page:number) {
  const query = new URLSearchParams({scope:'organization'});
  if (rule) query.set('rule',String(rule));
  if (page > 1) query.set('page',String(page));
  return query.toString();
}

export function OrganizationQuality({base,canWrite,rule,page}:{
  base:string; canWrite:boolean; rule:number; page:number;
}) {
  const [attempt, setAttempt] = useState(0);
  const [scan, setScan] = useState<Scan>({status:'loading', scanned:0});
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      const findings: Finding[] = [];
      const counts = new Map<number,number>();
      let total = 0;
      let scanned = 0;
      let after: string|null = null;
      const query = new URLSearchParams();
      do {
        const response = await fetch(base+'/quality/batch?'+query, {cache:'no-store',signal:controller.signal});
        if (!response.ok) throw new Error('scan failed');
        const batch: Batch = await response.json();
        if (controller.signal.aborted) return;
        scanned += batch.scanned;
        for (const finding of batch.findings) {
          findings.push(finding);
          for (const number of finding.rules) counts.set(number,(counts.get(number) ?? 0)+1);
          total += finding.rules.length;
        }
        if (batch.next === null) {
          setScan({status:'done',scanned,today:batch.today,findings,counts,total});
          return;
        }
        if (after !== null && batch.next <= after) throw new Error('invalid cursor');
        after = batch.next;
        query.set('after',after);
        query.set('started',batch.started);
        setScan({status:'loading',scanned});
      } while (!controller.signal.aborted);
    }
    run().catch(() => { if (!controller.signal.aborted) setScan({status:'error'}); });
    return () => controller.abort();
  },[base,attempt]);

  if (scan.status === 'error') return <div className="load-error" role="alert">
    <p>조직 전체 점검을 마치지 못했습니다.</p>
    <button onClick={() => {setScan({status:'loading',scanned:0}); setAttempt(attempt+1);}}>다시 점검</button>
  </div>;
  if (scan.status === 'loading') return <p role="status">조직 전체 점검 중 · {scan.scanned}건 확인</p>;

  const filtered = rule ? scan.findings.filter(finding => finding.rules.includes(rule)) : scan.findings;
  const last = Math.max(1,Math.ceil(filtered.length/pageSize));
  const current = Math.min(page,last);
  const href = (number:number) => '?'+scanQuery(rule,number);
  const detailQuery = new URLSearchParams({return_quality:scanQuery(rule,current)});
  return <>
    <p>기준일 {scan.today} · 점검 시작 후 등록된 특허는 다음 점검에 포함됩니다.</p>
    <ul aria-label="조직 전체 점검 요약">
      <li>점검 대상 {scan.scanned}건</li>
      <li>보완 항목 있음 {scan.findings.length}건</li>
      <li>발견 사항 없음 {scan.scanned-scan.findings.length}건</li>
      <li>전체 발견 사항 {scan.total}건</li>
    </ul>
    <label>점검 항목
      <select value={rule} onChange={event => router.push('?'+scanQuery(Number(event.target.value),1),{scroll:false})}>
        <option value={0}>전체 규칙</option>
        {patentQualityRules.map(([number,label]) => <option key={number} value={number}>{label} · {scan.counts.get(number) ?? 0}건</option>)}
      </select>
    </label>
    <h2>보완할 특허 {filtered.length}건</h2>
    {filtered.length === 0 ? <p>선택한 조건에서 발견 사항이 없습니다.</p> :
      <ul className="asset-list">{filtered.slice((current-1)*pageSize,current*pageSize).map(asset =>
        <li key={asset.id}>
          <Link prefetch={false} href={base+'/'+asset.id+'?'+detailQuery+(canWrite?'#edit-patent':'')}>
            {asset.title?.trim() || '제목 없는 특허'} · {asset.jurisdiction || '관할 미입력'} · {asset.number || '출원번호 미입력'}
          </Link>
          <p>{asset.rules.map(number => patentQualityRules[number-1][1]).join(' · ')}</p>
        </li>)}</ul>}
    {last > 1 && <nav aria-label="조직 전체 점검 결과 페이지" className="patent-pagination">
      {current > 1 && <Link href={href(current-1)} scroll={false}>이전 페이지</Link>}
      <span aria-current="page">{current} / {last}페이지</span>
      {current < last && <Link href={href(current+1)} scroll={false}>다음 페이지</Link>}
    </nav>}
  </>;
}
