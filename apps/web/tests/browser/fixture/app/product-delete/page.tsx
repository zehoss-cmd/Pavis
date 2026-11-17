import { ProductListItem } from '../../../../../src/app/account/organizations/[id]/products/product-list-item';
import { mockProductDelete } from '../actions';
const product={id:'product-1',name:'안전 제품',launch_year:2024,revenue_year:2025,revenue_amount:100,revenue_currency:'KRW'};
export default function Page(){return <main><h1>제품 삭제 검사</h1><section aria-label="관리자 목록"><ul className="asset-list"><ProductListItem org="test-org" product={product} canWrite={true} q="제품 검색" filter="missing" page={2} action={mockProductDelete}/></ul></section><section aria-label="조회자 목록"><ul className="asset-list"><ProductListItem org="test-org" product={product} canWrite={false} q="" filter="" page={1} action={mockProductDelete}/></ul></section></main>;}
