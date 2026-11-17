import { PatentMap, type GeographyRow } from '../../../../../src/app/account/organizations/[id]/intelligence/patent-map';
const base={unknown_count:0,pending_count:0,granted_count:0,rejected_count:0,withdrawn_count:0,expired_count:0,lapsed_count:0,revoked_count:0};
const rows:GeographyRow[]=[{...base,jurisdiction:'KR',total:2,applications:2,registrations:1,pending_count:1,granted_count:1},{...base,jurisdiction:'EP',total:1,applications:1,registrations:0,unknown_count:1}];
export default function Preview(){return <main className="dashboard"><PatentMap organizationId="3dbe1094-356b-44dd-9ab1-774bf3f995ff" familyId="c2000000-0000-4000-8000-000000000001" countries={rows}/></main>;}
