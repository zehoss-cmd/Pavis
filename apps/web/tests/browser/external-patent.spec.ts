import {test,expect} from '@playwright/test';
test('external lookup previews editable fields before registration',async({page})=>{
 await page.goto('/external-patent');
 await page.getByLabel('한국 출원번호').fill('1020050050026');
 await page.getByRole('button',{name:'특허 조회'}).click();
 await expect(page.getByRole('heading',{name:'조회 결과 확인'})).toBeVisible();
 await expect(page.getByLabel('발명의 명칭')).toHaveValue('테스트 특허');
 await expect(page.getByLabel('출원번호',{exact:true})).toHaveValue('1020050050026');
 await expect(page.getByLabel('법적 상태')).toHaveValue('unknown');
 await page.getByLabel('발명의 명칭').fill('검토한 특허');
 await expect(page.getByLabel('발명의 명칭')).toHaveValue('검토한 특허');
 await page.getByLabel('데이터 제공처').selectOption('google');
 await expect(page.getByText('Google Cloud 프로젝트와 서비스 계정 설정 필요')).toBeVisible();
 await expect(page.getByLabel('공개번호',{exact:true})).toBeVisible();
});
