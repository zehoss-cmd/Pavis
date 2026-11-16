import test from 'node:test';
import assert from 'node:assert/strict';
import {businessCardType,businessCardMaxBytes} from '../src/lib/profile/business-card.ts';
test('business card files require a supported type, matching signature, and bounded size',()=>{
 const png=Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
 const jpeg=Uint8Array.from([0xff,0xd8,0xff,0xe0]);
 assert.equal(businessCardType(png,'image/png'),'image/png');
 assert.equal(businessCardType(jpeg,'image/jpeg'),'image/jpeg');
 assert.equal(businessCardType(png,'image/jpeg'),null);
 assert.equal(businessCardType(jpeg,'image/png'),null);
 assert.equal(businessCardType(new Uint8Array(),'image/png'),null);
 assert.equal(businessCardType(new Uint8Array(businessCardMaxBytes+1),'image/jpeg'),null);
 assert.equal(businessCardType(Uint8Array.from([0xff,0xd8,0xff]),'image/jpeg'),null);
});
