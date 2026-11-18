import {createSign} from 'node:crypto';
import type {PatentLookup} from './types';
const b64=(v:string)=>Buffer.from(v).toString('base64url');
/** Google Patents public data is queried through BigQuery using a server-side service account. */
export async function lookupGoogle(publication:string,project:string,credentials:string):Promise<PatentLookup|null>{
 if(!/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(project))throw new Error('config');
 const account:unknown=JSON.parse(credentials);if(!account||typeof account!=='object')throw new Error('config');
 const {client_email,private_key}=account as Record<string,unknown>;
 if(typeof client_email!=='string'||!client_email.endsWith('.gserviceaccount.com')||typeof private_key!=='string')throw new Error('config');
 const now=Math.floor(Date.now()/1000),header=b64(JSON.stringify({alg:'RS256',typ:'JWT'})),claims=b64(JSON.stringify({iss:client_email,scope:'https://www.googleapis.com/auth/bigquery',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+300})),input=`${header}.${claims}`;
 const sign=createSign('RSA-SHA256');sign.update(input);sign.end();const assertion=`${input}.${sign.sign(private_key).toString('base64url')}`;
 const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),cache:'no-store',signal:AbortSignal.timeout(10000),redirect:'error'});
 if(!tokenResponse.ok)throw new Error('auth');const tokenData=await tokenResponse.json();if(typeof tokenData.access_token!=='string')throw new Error('auth');
 const query='SELECT publication_number, application_number, country_code, (SELECT t.text FROM UNNEST(title_localized) t ORDER BY IF(t.language = "en", 0, 1) LIMIT 1), CAST(filing_date AS STRING) FROM `patents-public-data.patents.publications` WHERE publication_number = @number LIMIT 1';
 const response=await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${project}/queries`,{method:'POST',headers:{authorization:`Bearer ${tokenData.access_token}`,'content-type':'application/json'},body:JSON.stringify({query,useLegacySql:false,parameterMode:'NAMED',queryParameters:[{name:'number',parameterType:{type:'STRING'},parameterValue:{value:publication}}],maximumBytesBilled:'1073741824',timeoutMs:10000,maxResults:1}),cache:'no-store',signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok)throw new Error('provider');const data=await response.json();if(data.jobComplete!==true)throw new Error('incomplete');
 const cells=data.rows?.[0]?.f;if(!Array.isArray(cells))return null;
 const values=cells.map((x:{v?:unknown})=>typeof x.v==='string'?x.v:'');const [pub,application,country,title,date]=values;
 if(pub!==publication||!title||!/^[A-Z]{2}$/.test(country))return null;
 const filing_date=/^\d{8}$/.test(date)&&date!=='00000000'?`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`:'';
 return {title:title.slice(0,300),jurisdiction:country,application_number:application.slice(0,100),publication_number:pub.slice(0,100),registration_number:'',rights_holder:'',filing_date,source:'Google Patents Public Data (IFI CLAIMS Patent Services / Google, CC BY 4.0)'};
}
