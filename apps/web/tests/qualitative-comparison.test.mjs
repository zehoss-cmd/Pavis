import test from 'node:test';
import assert from 'node:assert/strict';
import { compareQualitativeCriteria } from '../src/lib/valuations/qualitative-comparison.ts';

const current = { legal_score: 0, technical_score: 3, market_score: 4, commercial_score: 5, legal_weight: 25, technical_weight: 25, market_weight: 25, commercial_weight: 25, legal_note: null, technical_note: '새 근거', market_note: '', commercial_note: null };
test('원본을 항목 키로 비교하고 점수 0과 미입력 근거를 보존한다', () => {
 const rows = compareQualitativeCriteria([{key:'technical',score:3,weight:25,note:'이전 근거'},{key:'legal',score:0,weight:25,note:''}], current);
 assert.equal(rows[0].source.score, 0); assert.equal(rows[0].changed, false);
 assert.equal(rows[1].changed, true); assert.equal(rows[2].changed, null);
});
test('원본 항목이 중복되거나 잘못된 경우 비교 불가로 표시한다', () => {
 const rows = compareQualitativeCriteria([{key:'legal',score:0,weight:25,note:null},{key:'legal',score:1,weight:25,note:null},{key:'market',score:'4',weight:25,note:null}], current);
 assert.equal(rows[0].source, null); assert.equal(rows[2].changed, null);
});
