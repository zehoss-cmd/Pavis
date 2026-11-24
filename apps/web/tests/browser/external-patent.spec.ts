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
test('인증 설정 전에도 공개번호를 보존해 직접 등록을 준비한다',async({page})=>{
 await page.goto('/external-patent');
 await page.getByLabel('데이터 제공처').selectOption('google');
 await expect(page.getByRole('button',{name:'특허 조회'})).toBeDisabled();
 await page.getByLabel('공개번호',{exact:true}).fill('us-test001-b1');
 await page.getByRole('button',{name:'입력한 번호로 직접 등록'}).click();
 const form=page.locator('section').filter({has:page.getByRole('heading',{name:'특허 정보 직접 입력'})});
 await expect(form.getByLabel('공개번호',{exact:true})).toHaveValue('US-TEST001-B1');
 await expect(form.getByLabel('관할 국가 코드')).toHaveValue('US');
 await expect(form.getByLabel('출원번호',{exact:true})).toHaveValue('');
});
test('번호와 관할로 현재 조직의 등록 특허를 검색한다',async({page})=>{
 await page.goto('/external-patent');
 const link=page.getByRole('link',{name:'조직에 등록된 특허 찾기'});
 await expect(link).toHaveCount(0);
 await page.getByLabel('한국 출원번호').fill('10-2005-0050026');
 await expect(link).toHaveAttribute('href','/account/organizations/test-org/patents?field=application_number&q=1020050050026&country=KR');
 await page.getByLabel('데이터 제공처').selectOption('google');
 await expect(link).toHaveCount(0);
 await page.getByLabel('공개번호',{exact:true}).fill('us-test001-b1');
 await expect(link).toHaveAttribute('href','/account/organizations/test-org/patents?field=publication_number&q=US-TEST001-B1&country=US');
});
