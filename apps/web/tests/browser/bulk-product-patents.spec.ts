import { test,expect } from '@playwright/test';
test('selection survives page navigation and errors, and clears after success',async({page})=>{
 await page.goto('/bulk-product-patents');
 const submit=page.getByRole('button',{name:'선택한 특허 연결'});
 await expect(submit).toBeDisabled();
 await page.getByRole('checkbox',{name:/첫 특허/}).check();
 await page.getByRole('link',{name:'둘째 페이지'}).click();
 await expect(page.getByText('1건 선택')).toBeVisible();
 await expect(page.getByRole('heading',{name:'선택한 특허 확인'})).toBeVisible();
 await page.getByLabel('검색어').fill('선택 테스트');
 await page.getByRole('button',{name:'검색',exact:true}).click();
 await expect(page.getByText('1건 선택')).toBeVisible();
 await page.getByRole('link',{name:'둘째 페이지'}).click();
 await page.getByRole('button',{name:'이 페이지 전체 선택'}).click();
 await expect(page.getByText('3건 선택')).toBeVisible();
 await submit.click();
 await expect(page.locator('p[role=alert]')).toContainText('아무 항목도 추가되지 않았습니다');
 await expect(page.getByRole('checkbox',{name:/둘째 특허/})).toBeChecked();
 await page.getByRole('button',{name:'첫 특허 선택 해제'}).click();
 await expect(page.getByText('2건 선택')).toBeVisible();
 await submit.click();
 await expect(page.getByText('2건의 특허를 연결했습니다.')).toBeVisible();
 await expect(page.getByText('0건 선택')).toBeVisible();
 await expect(submit).toBeDisabled();
});

test('the 25 item limit applies across pages',async({page})=>{
 await page.goto('/bulk-product-patents?page=3');
 await page.getByRole('button',{name:'이 페이지 전체 선택'}).click();
 await expect(page.getByText('25건 선택')).toBeVisible();
 await page.getByRole('link',{name:'첫 페이지'}).click();
 await page.getByRole('checkbox',{name:/첫 특허/}).click();
 await expect(page.getByText('한 번에 최대 25건까지 선택할 수 있습니다.')).toBeVisible();
 await expect(page.getByText('25건 선택')).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/첫 특허/})).not.toBeChecked();
});

test('guidance navigates past linked-only results without losing selection',async({page})=>{
 await page.goto('/bulk-product-patents');
 await page.getByRole('checkbox',{name:/첫 특허/}).check();
 await page.getByRole('link',{name:'연결된 페이지만'}).click();
 await expect(page.getByText('이 페이지의 특허는 모두 이 제품에 연결되어 있습니다.')).toBeVisible();
 await expect(page.getByText('1건 선택')).toBeVisible();
 await page.getByRole('link',{name:'다음 특허 페이지'}).click();
 await expect(page.getByRole('checkbox',{name:/둘째 특허/})).toBeVisible();
 await expect(page.getByText('1건 선택')).toBeVisible();
});
