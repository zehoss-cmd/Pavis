import test from 'node:test';
import assert from 'node:assert/strict';
import {parseValuationPage,valuationPageQuery,valuationResultQuery,valuationPageSize,valuationMaxPage} from '../src/lib/valuations/pagination.ts';

test('assessment pages have bounded positive offsets',()=>{
 for(const value of [undefined, '', '0', '-1', '1.5', ['2'], '10000']) assert.equal(parseValuationPage(value),1);
 assert.equal(parseValuationPage('2'),2);
 assert.equal(parseValuationPage('9999'),valuationMaxPage);
 assert.equal(valuationPageSize,25);
});

test('page links preserve the requested asset and return location',()=>{
 assert.equal(valuationPageQuery(1),'?#valuation-records');
 assert.equal(valuationPageQuery(2,'abc & xyz'),'?page=2&asset=abc+%26+xyz#valuation-records');
 assert.equal(valuationResultQuery('update',2),'?update=1&page=2#valuation-records');
 assert.equal(valuationResultQuery('delete',1),'?delete=1#valuation-records');
});

test('assessment asset search preserves literal query and page context', async()=>{
 const {parseAssessmentAssetQuery,assessmentAssetPageQuery}=await import('../src/lib/valuations/pagination.ts');
 assert.equal(parseAssessmentAssetQuery(['a']), '');
 assert.equal(parseAssessmentAssetQuery('  AI 특허  '),'AI 특허');
 assert.equal(parseAssessmentAssetQuery('x'.repeat(101)).length,100);
 assert.equal(assessmentAssetPageQuery(2,'AI & 100%',3,'asset-id'),'?asset_query=AI+%26+100%25&asset_page=2&page=3&asset=asset-id#create-assessment');
 assert.equal(assessmentAssetPageQuery(1,'',1,null),'?#create-assessment');
 assert.equal(valuationPageQuery(2,'asset-id','AI',3),'?page=2&asset=asset-id&asset_query=AI&asset_page=3#valuation-records');
});

test('model search links preserve selected model and encode query', async()=>{
 const {modelListPageQuery,assessmentAssetPageQuery}=await import('../src/lib/valuations/pagination.ts');
 assert.equal(modelListPageQuery(2,'모델 & 100%'),'?q=%EB%AA%A8%EB%8D%B8+%26+100%25&page=2#model-list');
 assert.equal(modelListPageQuery(1,''),'?#model-list');
 assert.equal(assessmentAssetPageQuery(2,'AI',3,'asset-id','model-id'),'?asset_query=AI&asset_page=2&page=3&asset=asset-id&model=model-id#create-assessment');
 assert.equal(valuationPageQuery(2,'asset-id','AI',3,'model-id'),'?page=2&asset=asset-id&asset_query=AI&asset_page=3&model=model-id#valuation-records');
});
