import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContribution } from '../src/domain/products/patent-contribution.ts';
test('기여율은 미입력과 0%를 구분하고 0~100%를 소수점 둘째 자리까지 받는다',()=>{
 for(const [input,expected] of [['',null],['  ',null],['0','0'],['0.01','0.01'],['42.5','42.5'],['99.99','99.99'],['100','100'],['100.00','100.00']])assert.equal(parseContribution(input),expected);
 for(const input of ['-1','100.01','101','0.001','1e2','NaN','01','abc'])assert.equal(parseContribution(input),undefined);
 assert.equal(parseContribution(null),undefined);
});
