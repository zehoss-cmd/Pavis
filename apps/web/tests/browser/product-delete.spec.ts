import { test,expect } from '@playwright/test';
test('제품 삭제는 대상을 확인하고 취소 시 실행하지 않는다',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/product-delete');
 const admin=page.getByRole('region',{name:'관리자 목록'}),viewer=page.getByRole('region',{name:'조회자 목록'});
 await expect(viewer.getByRole('button',{name:'삭제'})).toHaveCount(0);await expect(viewer.getByRole('link',{name:'수정',exact:true})).toHaveCount(0);
 await expect(admin.getByRole('link',{name:'수정',exact:true})).toHaveAttribute('href',/return_revenue=missing#edit-product$/);
 await admin.getByRole('button',{name:'삭제'}).click();const dialog=page.getByRole('dialog',{name:'삭제 확인'});
 await expect(dialog).toContainText('안전 제품');await expect(dialog).toContainText('30일');await expect(dialog).toContainText('연결된 특허');
 await dialog.getByRole('button',{name:'취소'}).click();await expect(dialog).toBeHidden();await expect(page).toHaveURL(/\/product-delete$/);
 await admin.getByRole('button',{name:'삭제'}).click();await dialog.getByRole('button',{name:'삭제'}).click();
 await expect(page).toHaveURL(/product=product-1/);const url=new URL(page.url());expect(url.searchParams.get('q')).toBe('제품 검색');expect(url.searchParams.get('revenue')).toBe('missing');expect(url.searchParams.get('page')).toBe('2');
});
