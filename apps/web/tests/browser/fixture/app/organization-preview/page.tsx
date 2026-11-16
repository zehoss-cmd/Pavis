import { OrganizationCreate } from '../../../../../src/app/account/organization-create';
import { WorkspaceNavigation } from '../../../../../src/components/workspace-navigation';
async function mockCreate() { 'use server'; }
export default function Preview() {
 return <div className="workspace"><WorkspaceNavigation organizations={[{id:'3dbe1094-356b-44dd-9ab1-774bf3f995ff',name:'Pavis'}]} loadError={false}/><div className="organizations-panel"><h1>나의 조직</h1><OrganizationCreate action={mockCreate}/></div></div>;
}
