import Link from 'next/link';
import { BulkPatentForm } from '../../../../../src/app/account/organizations/[id]/products/[productId]/bulk-patent-form';
import { mockBulkPatent } from '../actions';
import { PatentChoiceSearch } from '../../../../../src/app/account/organizations/[id]/products/[productId]/patent-choice-search';
const many=Array.from({length:25},(_,i)=>({id:`bbbbbbbb-bbbb-4bbb-8bbb-${String(i+1).padStart(12,'0')}`,title:`대량 특허 ${i+1}`,jurisdiction:'KR',application_number:null}));
const choices=['첫 특허','둘째 특허','셋째 특허'].map((title,i)=>({id:`aaaaaaaa-aaaa-4aaa-8aaa-${String(i+1).padStart(12,'0')}`,title,jurisdiction:'KR',application_number:null}));
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){const page=(await searchParams).page||'1';await new Promise(resolve=>setTimeout(resolve,200));return <main><h1>특허 일괄 연결</h1><PatentChoiceSearch field="title" query="" linkedPage={1}/><BulkPatentForm org="org" product="product" choices={page==='4'?[]:page==='3'?many:page==='1'?choices.slice(0,1):choices.slice(1)} empty={{message:'이 페이지의 특허는 모두 이 제품에 연결되어 있습니다.',action:'next',href:'?page=2'}} action={mockBulkPatent}/><nav><Link href="?page=1">첫 페이지</Link><Link href="?page=2">둘째 페이지</Link><Link href="?page=3">대량 페이지</Link><Link href="?page=4">연결된 페이지만</Link></nav></main>;}
