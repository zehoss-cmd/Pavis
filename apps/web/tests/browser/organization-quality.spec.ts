import {test,expect} from '@playwright/test';

test('전체 점검은 실패한 중간 집계를 숨기고 다음 묶음의 특허도 검색한다', async ({page}) => {
  const started='2026-11-22T03:00:00.000Z';
  const today='2026-11-22';
  let fail=true;
  const calls:string[]=[];
  await page.route('**/test-patents/quality/batch*', async route => {
    const params=new URL(route.request().url()).searchParams;
    const after=params.get('after');
    calls.push(after ?? 'first');
    if (!after) return route.fulfill({json:{started,today,scanned:25,next:'25',
      findings:Array.from({length:25},(_,i)=>({id:String(i+1),title:'특허 '+(i+1),jurisdiction:'KR',number:null,rules:[6]}))}});
    expect(params.get('started')).toBe(started);
    if (fail) return route.fulfill({status:503,body:''});
    if (after==='25') return route.fulfill({json:{started,today,scanned:3,next:'28',
      findings:[{id:'28',title:'마지막 특허',jurisdiction:'US',number:'101',rules:[6,7]}]}});
    return route.fulfill({json:{started,today,scanned:0,next:null,findings:[]}});
  });
  await page.goto('/organization-quality?scope=organization');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('마치지 못했습니다');
  await expect(page.getByLabel('조직 전체 점검 요약')).toHaveCount(0);
  fail=false;
  await page.getByRole('button',{name:'다시 점검'}).click();
  const summary=page.getByLabel('조직 전체 점검 요약');
  await expect(summary).toContainText('점검 대상 28건');
  await expect(summary).toContainText('보완 항목 있음 26건');
  await expect(summary).toContainText('전체 발견 사항 27건');
  await page.getByRole('link',{name:'다음 페이지'}).click();
  await expect(page.getByRole('link',{name:/마지막 특허/})).toHaveAttribute('href',/return_quality=scope%3Dorganization%26page%3D2$/);
  await page.getByLabel('점검 항목').selectOption('7');
  await expect(page.getByRole('heading',{name:'보완할 특허 1건'})).toBeVisible();
  await expect(page.getByRole('link',{name:/마지막 특허/})).toHaveAttribute('href',/return_quality=scope%3Dorganization%26rule%3D7$/);
  expect(calls.filter(call=>call==='28')).toHaveLength(1);
});
