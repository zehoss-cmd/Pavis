import 'server-only';
import nodemailer from 'nodemailer';

const operator = 'jhlee9097@gmail.com';
export function businessCardMailConfigured() {
 return Boolean(process.env.PAVIS_SMTP_HOST && process.env.PAVIS_SMTP_PORT && process.env.PAVIS_SMTP_USER && process.env.PAVIS_SMTP_PASSWORD && process.env.PAVIS_SMTP_FROM && process.env.PAVIS_SITE_URL);
}
export async function sendBusinessCardNotice() {
 if (!businessCardMailConfigured()) throw new Error('Mail service is not configured');
 const site = new URL(process.env.PAVIS_SITE_URL!);
 if (site.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('Invalid site URL');
 const port = Number(process.env.PAVIS_SMTP_PORT);
 if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP port');
 const transport = nodemailer.createTransport({host:process.env.PAVIS_SMTP_HOST,port,secure:port===465,requireTLS:true,auth:{user:process.env.PAVIS_SMTP_USER,pass:process.env.PAVIS_SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
 await transport.sendMail({from:process.env.PAVIS_SMTP_FROM,to:operator,subject:'[PAVIS] 명함 인증 검토 요청',text:`새 명함 인증 요청이 접수되었습니다.\n\n운영자 계정으로 로그인한 후 검토해 주세요.\n${new URL('/account/business-card-review',site).toString()}\n\n명함은 이 메일에 첨부되지 않습니다.`});
}
