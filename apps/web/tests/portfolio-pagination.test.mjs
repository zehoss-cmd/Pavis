import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePortfolioPage,portfolioPageQuery,portfolioPageSize,portfolioMaxPage} from '../src/lib/portfolios/pagination.ts';
test('portfolio pages are bounded positive integers',()=>{
 assert.equal(parsePortfolioPage(undefined),1);assert.equal(parsePortfolioPage('0'),1);assert.equal(parsePortfolioPage('-1'),1);
 assert.equal(parsePortfolioPage(['2']),1);assert.equal(parsePortfolioPage('2'),2);assert.equal(parsePortfolioPage('9999'),portfolioMaxPage);
 assert.equal(portfolioPageSize,25);assert.equal(portfolioPageQuery(1),'?');assert.equal(portfolioPageQuery(2),'?page=2');
});
