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
test('보존된 TEST 예시는 제공처별로 열리고 실조회와 구분된다',async({page})=>{
 await page.goto('/external-patent');
 const preview=page.getByRole('button',{name:'[TEST] 예시 레코드 열기'});
 await preview.click();
 await expect(page.getByLabel('발명의 명칭')).toHaveValue('[TEST] 광학 센서 보정 장치');
 await page.getByLabel('데이터 제공처').selectOption('google');
 await expect(page.getByRole('heading',{name:'[TEST] 등록 미리보기'})).toHaveCount(0);
 await preview.click();
 await expect(page.getByLabel('출원번호',{exact:true})).toHaveValue('TEST-US-PAVIS-002');
 await expect(page.getByLabel('정보 출처')).toHaveValue(/^\[TEST\]/);
});
