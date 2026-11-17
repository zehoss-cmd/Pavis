import { BulkPatentForm } from '../../../../../src/app/account/organizations/[id]/products/[productId]/bulk-patent-form';
import { mockBulkPatent } from '../actions';
const choices=['첫 특허','둘째 특허','셋째 특허'].map((title,i)=>({id:`aaaaaaaa-aaaa-4aaa-8aaa-${String(i+1).padStart(12,'0')}`,title,jurisdiction:'KR',application_number:null}));
export default function Page(){return <main><h1>특허 일괄 연결</h1><BulkPatentForm org="org" product="product" choices={choices} query="검색어" choicePage={2} linkedPage={1} action={mockBulkPatent}/></main>;}
