import { test,expect } from '@playwright/test';
test('bulk selection survives errors and retries with the remaining choices',async({page})=>{
 await page.goto('/bulk-product-patents');
 const submit=page.getByRole('button',{name:'선택한 특허 연결'});
 await expect(submit).toBeDisabled();
 await page.getByRole('button',{name:'이 페이지 전체 선택'}).click();
 await expect(page.getByText('3건 선택')).toBeVisible();
 await submit.click();
 await expect(page.locator('p[role=alert]')).toContainText('아무 항목도 추가되지 않았습니다');
 await expect(page.getByRole('checkbox',{name:/첫 특허/})).toBeChecked();
 await expect(page.getByRole('checkbox',{name:/둘째 특허/})).toBeChecked();
 await page.getByRole('checkbox',{name:/첫 특허/}).uncheck();
 await expect(page.getByText('2건 선택')).toBeVisible();
 await submit.click();
 await expect(page).toHaveURL(/count=2/);
 await expect(page).toHaveURL(/page=2/);
});
