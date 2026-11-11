import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePortfolioPage,portfolioPageQuery,portfolioPageSize,portfolioMaxPage} from '../src/lib/portfolios/pagination.ts';
test('portfolio pages are bounded positive integers',()=>{
 assert.equal(parsePortfolioPage(undefined),1);assert.equal(parsePortfolioPage('0'),1);assert.equal(parsePortfolioPage('-1'),1);
 assert.equal(parsePortfolioPage(['2']),1);assert.equal(parsePortfolioPage('2'),2);assert.equal(parsePortfolioPage('9999'),portfolioMaxPage);
 assert.equal(portfolioPageSize,25);assert.equal(portfolioPageQuery(1),'?');assert.equal(portfolioPageQuery(2),'?page=2');
});

test('asset search and page links preserve bounded literal input', async () => {
 const {parsePortfolioAssetQuery}=await import('../src/lib/portfolios/pagination.ts');
 assert.equal(parsePortfolioAssetQuery('  AI 특허  '),'AI 특허');
 assert.equal(parsePortfolioAssetQuery('x'.repeat(101)).length,100);
 assert.equal(parsePortfolioAssetQuery(['a','b']),'');
 assert.equal(portfolioPageQuery(2,'AI & 100%'),'?page=2&asset_query=AI+%26+100%25');
});

test('portfolio list page links preserve encoded search terms', async () => {
 const {portfolioListPageQuery}=await import('../src/lib/portfolios/pagination.ts');
 assert.equal(portfolioListPageQuery(1,''),'?');
 assert.equal(portfolioListPageQuery(1,'AI & 특허'),'?q=AI+%26+%ED%8A%B9%ED%97%88');
 assert.equal(portfolioListPageQuery(3,'100%'),'?q=100%25&page=3');
});

test('candidate pages preserve the linked list page and literal search query', () => {
 assert.equal(portfolioPageQuery(3, 'AI & 100%', 4), '?page=3&asset_query=AI+%26+100%25&choice_page=4');
 assert.equal(portfolioPageQuery(1, '', 2), '?choice_page=2');
});

test('empty candidate pages direct users to a useful next step', async () => {
 const {portfolioChoiceEmpty} = await import('../src/lib/portfolios/pagination.ts');
 assert.equal(portfolioChoiceEmpty(1, '', 0, false).action, 'register');
 assert.equal(portfolioChoiceEmpty(1, 'AI', 0, false).action, 'reset');
 assert.equal(portfolioChoiceEmpty(1, 'AI', 3, false).action, 'reset');
 assert.equal(portfolioChoiceEmpty(1, '', 25, true).action, 'next');
 assert.equal(portfolioChoiceEmpty(2, 'AI', 0, false).action, 'previous');
 assert.equal(portfolioChoiceEmpty(1000, '', 25, true).action, 'previous');
});
