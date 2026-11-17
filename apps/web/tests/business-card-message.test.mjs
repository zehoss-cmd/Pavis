import test from 'node:test';
import assert from 'node:assert/strict';
import {businessCardMessage} from '../src/lib/mail/business-card-message.ts';
test('operator notification contains the fixed recipient and authenticated review path only',()=>{
 const message=businessCardMessage('https://pavis.vercel.app',true);
 assert.equal(message.to,'jhlee9097@gmail.com');
 assert.match(message.text,/https:\/\/pavis\.vercel\.app\/account\/business-card-review/);
 assert.deepEqual(Object.keys(message).sort(),['subject','text','to']);
 assert.throws(()=>businessCardMessage('http://pavis.vercel.app',true));
 assert.throws(()=>businessCardMessage('javascript:alert(1)',false));
});
