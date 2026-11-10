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

test('복사 당시와 현재의 기준일과 점수 차이를 정확히 비교한다', async () => {
 const { compareQualitativeSummary } = await import('../src/lib/valuations/qualitative-comparison.ts');
 assert.deepEqual(compareQualitativeSummary({assessment_date:'2026-01-01',weighted_score:'2.01'}, {assessment_date:'2026-02-01',weighted_score:2.3}), {sourceDate:'2026-01-01',currentDate:'2026-02-01',sourceScore:'2.01',currentScore:'2.30',scoreDifference:29});
 assert.equal(compareQualitativeSummary({weighted_score:'5.00'}, {assessment_date:'2026-01-01',weighted_score:0}).scoreDifference, -500);
 assert.equal(compareQualitativeSummary({assessment_date:'2026-02-30',weighted_score:null}, {assessment_date:'2026-01-01',weighted_score:0}).sourceDate, null);
 assert.equal(compareQualitativeSummary({weighted_score:''}, {assessment_date:'2026-01-01',weighted_score:0}).scoreDifference, null);
});
