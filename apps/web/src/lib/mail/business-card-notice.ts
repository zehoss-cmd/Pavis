import 'server-only';
import nodemailer from 'nodemailer';
import { businessCardMessage } from './business-card-message';
export function businessCardMailConfigured() {
 return Boolean(process.env.PAVIS_SMTP_HOST && process.env.PAVIS_SMTP_PORT && process.env.PAVIS_SMTP_USER && process.env.PAVIS_SMTP_PASSWORD && process.env.PAVIS_SMTP_FROM && process.env.PAVIS_SITE_URL);
}
export async function sendBusinessCardNotice() {
 if (!businessCardMailConfigured()) throw new Error('Mail service is not configured');
 const message = businessCardMessage(process.env.PAVIS_SITE_URL!,process.env.NODE_ENV === 'production');
 const port = Number(process.env.PAVIS_SMTP_PORT);
 if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SMTP port');
 const transport = nodemailer.createTransport({host:process.env.PAVIS_SMTP_HOST,port,secure:port===465,requireTLS:true,auth:{user:process.env.PAVIS_SMTP_USER,pass:process.env.PAVIS_SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
 await transport.sendMail({from:process.env.PAVIS_SMTP_FROM,...message});
}
