import {ExternalLookup} from '../../../../../src/app/account/organizations/[id]/patents/external/external-lookup';
import {mockExternalPatent} from '../actions';
export default function Page(){return <main><h1>특허 조회 테스트</h1><ExternalLookup org="test-org" families={[]} configured={true} lookup={mockExternalPatent}/></main>;}
