import { test,expect } from '@playwright/test';
test('느린 링크 전환에서 진행 표시와 로딩 화면을 보이고 완료 후 제거한다',async({page})=>{
 await page.goto('/loading-check');
 await page.route('**/loading-check/slow*',async route=>{if(route.request().headers().rsc==='1')await new Promise(resolve=>setTimeout(resolve,800));await route.continue();});
 await page.getByRole('link',{name:'느린 페이지 열기'}).click();
 await expect(page.getByRole('status').filter({hasText:'화면을 불러오는 중입니다.'})).toBeVisible();
 const loading=page.getByRole('status',{name:'페이지를 불러오는 중입니다'});await expect(loading).toBeVisible();
 await expect(page.getByText('공통 헤더')).toBeVisible();await expect(page.getByRole('heading',{name:'느린 페이지 완료'})).toBeVisible();
 await expect(loading).toHaveCount(0);await expect(page.locator('.pavis-navigation-progress')).toHaveCount(0);
});
test('같은 페이지 이동은 로딩 화면을 만들지 않고 검색 제출은 진행 표시를 보여준다',async({page})=>{
 await page.goto('/loading-check');await page.getByRole('link',{name:'같은 페이지 이동'}).click();await expect(page.locator('.pavis-navigation-progress')).toHaveCount(0);
 await page.getByRole('button',{name:'검색 취소 테스트'}).click();await expect(page.locator('.pavis-navigation-progress')).toHaveCount(0);
 await page.route('**/*',async route=>{const req=route.request();if(req.isNavigationRequest()&&new URL(req.url()).pathname==='/loading-check/slow')await new Promise(resolve=>setTimeout(resolve,1200));await route.continue();});
 await page.getByLabel('검색어').fill('특허');
 const painted=await page.locator('form').first().evaluate((form:HTMLFormElement)=>{form.requestSubmit();return !!document.querySelector('.pavis-navigation-progress[role="status"]');});
 expect(painted).toBe(true);
 await expect(page.getByRole('heading',{name:'느린 페이지 완료'})).toBeVisible();await expect(page.locator('.pavis-navigation-progress')).toHaveCount(0);
});
test('동작 줄이기 설정에서 로딩 애니메이션을 사용하지 않는다',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/loading-check');await page.getByRole('link',{name:'느린 페이지 열기'}).click();
 const loading=page.getByRole('status',{name:'페이지를 불러오는 중입니다'});await expect(loading).toBeVisible();
 await expect(loading.locator('.pavis-loading-heading span').first()).toHaveCSS('animation-name','none');await expect(page.getByRole('heading',{name:'느린 페이지 완료'})).toBeVisible();
});

test('로딩 중에도 공통 탐색을 이용해 다른 화면으로 전환할 수 있다',async({page})=>{
 await page.goto('/loading-check');await page.getByRole('link',{name:'느린 페이지 열기'}).click();
 await expect(page.getByRole('status',{name:'페이지를 불러오는 중입니다'})).toBeVisible();
 await page.getByRole('link',{name:'공통 헤더'}).click();await expect(page.getByRole('heading',{name:'전환 시작'})).toBeVisible();
 await expect(page.getByRole('status',{name:'페이지를 불러오는 중입니다'})).toHaveCount(0);
});
test('조직 선택 전환 중에도 진행 상태를 표시한다',async({page})=>{
 await page.goto('/loading-check/org');
 await page.route('**/account/organizations/**',async route=>{if(route.request().headers().rsc==='1')await new Promise(resolve=>setTimeout(resolve,800));await route.continue();});
 await page.getByLabel('현재 조직').selectOption('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
 await expect(page.getByRole('status').filter({hasText:'조직을 불러오는 중입니다'})).toBeVisible();
 await expect(page.getByRole('status',{name:'페이지를 불러오는 중입니다'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'선택한 조직 화면'})).toBeVisible();
});
