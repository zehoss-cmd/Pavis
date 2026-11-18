import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {lookupGoogle} from '../src/lib/patent-providers/google.ts';
test('Google BigQuery lookup is parameterized, bounded and maps only verified fields',async()=>{
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
 const credentials=JSON.stringify({client_email:'test@project.iam.gserviceaccount.com',private_key:privateKey});
 const original=globalThis.fetch;const calls=[];
 try {globalThis.fetch=async(url,options)=>{calls.push([url,options]);return calls.length===1?Response.json({access_token:'token'}):Response.json({jobComplete:true,rows:[{f:[{v:'US-7650331-B1'},{v:'US-123-A'},{v:'US'},{v:'Example patent'},{v:'20050203'}]}]});};
 const value=await lookupGoogle('US-7650331-B1','pavis-test',credentials);
 assert.equal(value.title,'Example patent');assert.equal(value.filing_date,'2005-02-03');assert.equal(value.rights_holder,'');
 const body=JSON.parse(calls[1][1].body);assert.equal(body.maximumBytesBilled,'1073741824');assert.equal(body.queryParameters[0].parameterValue.value,'US-7650331-B1');assert.doesNotMatch(body.query,/US-7650331-B1/);
 }finally{globalThis.fetch=original;}
});
