import { ProfileView } from '../../../../../src/app/account/profile/profile-view';

async function mockSave() { 'use server'; }
export default function Preview() {
 return <div className="workspace"><div className="workspace-content"><ProfileView email="sample@example.com" name="이재호" phone="010-1234-5678" jobTitle="IP 매니저" verified action={mockSave}/></div></div>;
}
