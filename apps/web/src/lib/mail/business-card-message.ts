export function businessCardMessage(siteUrl: string, production: boolean) {
 const site = new URL(siteUrl);
 if (!['http:', 'https:'].includes(site.protocol) || (production && site.protocol !== 'https:')) throw new Error('Invalid site URL');
 return {
  to: 'jhlee9097@gmail.com',
  subject: '[PAVIS] 명함 인증 검토 요청',
  text: `새 명함 인증 요청이 접수되었습니다.\n\n운영자 계정으로 로그인한 후 검토해 주세요.\n${new URL('/account/business-card-review',site).toString()}\n\n명함은 이 메일에 첨부되지 않습니다.`,
 };
}
