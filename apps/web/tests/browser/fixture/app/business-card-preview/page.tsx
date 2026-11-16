import { BusinessCardForm } from '../../../../../src/app/account/profile/business-card-form';
async function mockSubmit() { 'use server'; }
export default function Preview() {
 return <main className="profile-page"><h1>명함 인증</h1><BusinessCardForm action={mockSubmit}/></main>;
}
