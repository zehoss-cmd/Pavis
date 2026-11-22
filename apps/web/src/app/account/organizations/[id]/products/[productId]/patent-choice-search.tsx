'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import Link from '@/components/navigation-link';
import { productPatentSearchFields,type ProductPatentSearchField } from '@/domain/products/patent-search';
export function PatentChoiceSearch({field,query,linkedPage,returnSearch=''}:{field:ProductPatentSearchField;query:string;linkedPage:number;returnSearch?:string}){
 const router=useRouter(),[pending,startTransition]=useTransition();
 const resetParams=new URLSearchParams(returnSearch);
 if(linkedPage>1)resetParams.set('linked_page',String(linkedPage));
 return <form className="portfolio-asset-search" onSubmit={event=>{event.preventDefault();const values=new FormData(event.currentTarget),params=new URLSearchParams(returnSearch),q=String(values.get('asset_query')||'').trim();if(q){params.set('asset_query',q);params.set('asset_field',String(values.get('asset_field')||'title'));}if(linkedPage>1)params.set('linked_page',String(linkedPage));startTransition(()=>router.push(`?${params.toString()}#product-patents`));}}><label>검색 항목<select name="asset_field" defaultValue={field}>{Object.entries(productPatentSearchFields).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>검색어<input type="search" name="asset_query" defaultValue={query} maxLength={100} placeholder="검색어를 입력하세요"/></label><button type="submit" disabled={pending}>{pending?'검색 중...':'검색'}</button><Link href={`?${resetParams}#product-patents`}>초기화</Link></form>;
}
