import { test, expect } from '@playwright/test';
import path from 'node:path';

test('changing the selected file requires a new preview before import', async ({page}) => {
 await page.goto('/');
 const file=page.locator('input[type=file]');
 await file.setInputFiles({name:'first.csv',mimeType:'text/csv',buffer:Buffer.from('title,jurisdiction,application_number\nfirst.csv,KR,1001')});
 await page.getByRole('button',{name:'파일 검토',exact:true}).click();
 await expect(page.getByRole('cell',{name:'first.csv'})).toBeVisible();
 await expect(page.getByRole('button',{name:'확인 후 등록'})).toBeVisible();
 await file.setInputFiles({name:'second.csv',mimeType:'text/csv',buffer:Buffer.from('title,jurisdiction,application_number\nsecond.csv,KR,1002')});
 await expect(page.getByText('파일이 변경되었습니다.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'확인 후 등록'})).toHaveCount(0);
 await page.getByRole('button',{name:'파일 검토',exact:true}).click();
 await expect(page.getByRole('cell',{name:'second.csv'})).toBeVisible();
 await expect(page.getByRole('cell',{name:'first.csv'})).toHaveCount(0);
 await page.getByRole('button',{name:'확인 후 등록'}).click();
 await expect(page.getByText('1건의 특허를 등록했습니다.',{exact:false})).toBeVisible();
});

test('confirmation cancel and Escape do not submit; confirm submits once', async ({page}) => {
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const trigger=page.getByRole('button',{name:'특허 삭제',exact:true});
 const dialog=page.getByRole('dialog',{name:'특허 삭제 확인'});
 const count=page.getByLabel('제출 횟수');
 await trigger.click();
 await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'취소'}).click();
 await expect(dialog).toBeHidden();
 await expect(count).toHaveText('0');
 await trigger.click();
 await page.keyboard.press('Escape');
 await expect(dialog).toBeHidden();
 await expect(count).toHaveText('0');
 await trigger.click();
 await dialog.getByRole('button',{name:'특허 삭제'}).click();
 await expect(count).toHaveText('1');
});

test('download reports pending, successful file and errors without saving HTML', async ({page}) => {
 let status=200, type='text/csv; charset=utf-8';
 await page.route('**/test-download',async route=>{
  await new Promise(resolve=>setTimeout(resolve,250));
  await route.fulfill({status,contentType:type,body:'sample'});
 });
 await page.goto('/');
 const downloadSection=page.getByRole('region',{name:'다운로드'});
 const button=downloadSection.getByRole('button',{name:'CSV 다운로드'});
 const file=page.waitForEvent('download');
 await button.click();
 await expect(page.getByRole('button',{name:'파일 준비 중...'})).toBeDisabled();
 expect((await file).suggestedFilename()).toBe('example.csv');
 await expect(page.getByText('다운로드가 시작되었습니다.',{exact:false})).toBeVisible();
 status=409;
 await button.click();
 await expect(downloadSection.getByRole('alert')).toContainText('평가 자료가 완전하지 않아');
 status=401;
 await button.click();
 await expect(downloadSection.getByRole('alert')).toContainText('로그인 상태와 접근 권한');
 status=200; type='text/html';
 await button.click();
 await expect(downloadSection.getByRole('alert')).toContainText('파일을 준비하지 못했습니다');
});


test('invalid and duplicate CSV rows cannot be registered', async ({page}) => {
 await page.goto('/');
 const file=page.locator('input[type=file]');
 const select=async (name:string,content:string) => {
  await file.setInputFiles({name,mimeType:'text/csv',buffer:Buffer.from(content)});
  await page.getByRole('button',{name:'파일 검토',exact:true}).click();
 };
 await select('invalid.csv','title,jurisdiction,application_number\n특허,K,');
 await expect(page.getByRole('alert').filter({hasText:'국가는 KR'})).toBeVisible();
 await expect(page.getByRole('button',{name:'확인 후 등록'})).toHaveCount(0);
 await file.setInputFiles({name:'duplicate.csv',mimeType:'text/csv',buffer:Buffer.from('title,jurisdiction,application_number\n첫 특허,KR,AB 1\n둘째 특허,kr,ab1')});
 await expect(page.getByText('파일이 변경되었습니다.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'파일 검토',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'국가·출원번호가 중복'})).toBeVisible();
 await expect(page.getByRole('button',{name:'확인 후 등록'})).toHaveCount(0);
 await select('existing.csv','title,jurisdiction,application_number\n기존 특허,KR,EXISTS-001');
 await expect(page.getByRole('alert').filter({hasText:'이미 등록되어 있습니다'})).toBeVisible();
 await expect(page.getByRole('button',{name:'확인 후 등록'})).toHaveCount(0);
});

test('a real XLSX fixture is previewed and can be confirmed', async ({page}) => {
 await page.goto('/');
 await page.locator('input[type=file]').setInputFiles(path.resolve(__dirname,'../fixtures/patent-excel.xlsx'));
 await page.getByRole('button',{name:'파일 검토',exact:true}).click();
 await expect(page.getByRole('cell',{name:'실제 엑셀 양식'})).toBeVisible();
 await expect(page.getByRole('cell',{name:'001234'})).toBeVisible();
 await expect(page.getByRole('cell',{name:'2025-02-14'})).toBeVisible();
 await page.getByRole('button',{name:'확인 후 등록'}).click();
 await expect(page.getByText('1건의 특허를 등록했습니다.',{exact:false})).toBeVisible();
});

test('old file errors and success messages clear when another file is selected', async ({page}) => {
 await page.goto('/');
 const file=page.locator('input[type=file]');
 await file.setInputFiles({name:'empty.csv',mimeType:'text/csv',buffer:Buffer.alloc(0)});
 await page.getByRole('button',{name:'파일 검토',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'파일은 비어 있지 않아야'})).toBeVisible();
 await file.setInputFiles({name:'valid.csv',mimeType:'text/csv',buffer:Buffer.from('title,jurisdiction,application_number\n새 특허,KR,1001')});
 await expect(page.getByRole('alert').filter({hasText:'파일은 비어 있지 않아야'})).toHaveCount(0);
 await page.getByRole('button',{name:'파일 검토',exact:true}).click();
 await expect(page.getByRole('cell',{name:'새 특허'})).toBeVisible();
 await page.getByRole('button',{name:'확인 후 등록'}).click();
 const success=page.getByText('1건의 특허를 등록했습니다.',{exact:false});
 await expect(success).toBeVisible();
 await file.setInputFiles({name:'next.csv',mimeType:'text/csv',buffer:Buffer.from('title,jurisdiction,application_number\n다음 특허,KR,1002')});
 await expect(success).toHaveCount(0);
});

for (const [label,button] of [['특허 등록 시험','특허 등록'],['특허 수정 시험','변경 저장']] as const) {
 test(`${label}: duplicate and network errors preserve fields for retry`, async ({page}) => {
  await page.goto('/');
  const section=page.getByRole('region',{name:label});
  await section.getByLabel('발명의 명칭').fill('보존할 특허');
  await section.getByLabel('관할 국가 코드').fill('KR');
  await section.getByLabel('특허 패밀리').selectOption('family');
  await section.getByLabel('출원번호').fill('DUP');
  await section.getByLabel('권리자').fill('테스트 권리자');
  await section.getByLabel('법적 상태').selectOption('granted');
  await section.getByLabel('정보 출처').fill('테스트 출처');
  await section.getByRole('button',{name:button}).click();
  await expect(section.getByRole('button',{name:'처리 중...'})).toBeDisabled();
  await expect(section.getByLabel('발명의 명칭')).toBeDisabled();
  await expect(section.getByRole('alert')).toContainText('동일한 출원번호');
  await expect(section.getByLabel('발명의 명칭')).toHaveValue('보존할 특허');
  await expect(section.getByLabel('특허 패밀리')).toHaveValue('family');
  await expect(section.getByLabel('권리자')).toHaveValue('테스트 권리자');
  await expect(section.getByLabel('법적 상태')).toHaveValue('granted');
  await expect(section.getByLabel('정보 출처')).toHaveValue('테스트 출처');
  await section.getByLabel('출원번호').fill('NETWORK');
  await section.getByRole('button',{name:button}).click();
  await expect(section.getByRole('alert')).toContainText('저장 여부를 확인');
  await expect(section.getByLabel('발명의 명칭')).toHaveValue('보존할 특허');
  await expect(section.getByLabel('정보 출처')).toHaveValue('테스트 출처');
  await section.getByLabel('출원번호').fill('AUTH');
  await section.getByRole('button',{name:button}).click();
  await expect(section.getByRole('alert')).toContainText('로그인 상태를 확인');
  await expect(section.getByLabel('발명의 명칭')).toHaveValue('보존할 특허');
  await expect(section.getByLabel('법적 상태')).toHaveValue('granted');
  await section.getByLabel('출원번호').fill('RETRY');
  await section.getByRole('button',{name:button}).click();
  await expect(page).toHaveURL(/mock_saved=1/);
 });
}

for (const [label,button] of [['정성평가 초안 시험','초안 저장'],['정성평가 수정 시험','변경 저장']] as const) {
 test(`${label}: draft inputs survive save, connection and session errors`, async ({page}) => {
  await page.goto('/');
  const section=page.getByRole('region',{name:label});
  if(label==='정성평가 초안 시험') {
   await section.getByLabel('대상 특허').selectOption('asset2');
   await section.getByLabel('평가 모델').selectOption('model2');
  }
  await section.getByLabel('평가 기준일').fill('2026-05-01');
  for (const [name,value] of [['법적 안정성 점수','0'],['기술성 점수','2'],['시장성 점수','3'],['사업화 가능성 점수','4']] as const) await section.getByLabel(name).selectOption(value);
  await section.getByLabel('법적 안정성 근거').fill('저장 실패');
  await section.getByLabel('기술성 근거').fill('유지할 근거');
  await section.getByRole('button',{name:button}).click();
  await expect(section.getByRole('button',{name:'처리 중...'})).toBeDisabled();
  await expect(section.getByRole('alert')).toContainText('저장하지 못했습니다');
  await expect(section.getByLabel('평가 기준일')).toHaveValue('2026-05-01');
  await expect(section.getByLabel('법적 안정성 점수')).toHaveValue('0');
  await expect(section.getByLabel('기술성 점수')).toHaveValue('2');
  await expect(section.getByLabel('기술성 근거')).toHaveValue('유지할 근거');
  if(label==='정성평가 초안 시험') {
   await expect(section.getByLabel('대상 특허')).toHaveValue('asset2');
   await expect(section.getByLabel('평가 모델')).toHaveValue('model2');
  }
  await section.getByLabel('법적 안정성 근거').fill('연결 오류');
  await section.getByRole('button',{name:button}).click();
  await expect(section.getByRole('alert')).toContainText('저장 여부를 확인');
  await expect(section.getByLabel('기술성 근거')).toHaveValue('유지할 근거');
  await section.getByLabel('법적 안정성 근거').fill('인증 오류');
  await section.getByRole('button',{name:button}).click();
  await expect(section.getByRole('alert')).toContainText('로그인 상태를 확인');
  await expect(section.getByLabel('법적 안정성 점수')).toHaveValue('0');
  await section.getByLabel('법적 안정성 근거').fill('확인된 근거');
  await section.getByRole('button',{name:button}).click();
  await expect(page).toHaveURL(/mock_quality_saved=1/);
 });
}

for (const [label,button] of [['금액평가 초안 시험','초안 저장 및 계산'],['금액평가 수정 시험','변경 저장']] as const) {
 test(`${label}: monetary inputs survive save, connection and session errors`, async ({page}) => {
  await page.goto('/');
  const section=page.getByRole('region',{name:label});
  if(label==='금액평가 초안 시험') await section.getByLabel('대상 특허').selectOption('asset2');
  await section.getByLabel('평가 기준일').fill('2026-05-01');
  await section.getByLabel('시나리오').selectOption('optimistic');
  await section.locator('[name="currency"]').selectOption('USD');
  for(const [name,value] of [['years','7'],['base_sales','1234.50'],['growth_rate','-10'],['royalty_rate','4.25'],['contribution_rate','80'],['annual_cost','0'],['tax_rate','20'],['discount_rate','9.5']] as const) await section.locator(`[name="${name}"]`).fill(value);
  await section.getByLabel('가정의 근거와 출처').fill('저장 실패');
  await section.getByRole('button',{name:button}).click();
  await expect(section.getByRole('button',{name:'처리 중...'})).toBeDisabled();
  await expect(section.getByRole('alert')).toContainText('저장하지 못했습니다');
  await expect(section.getByLabel('평가 기준일')).toHaveValue('2026-05-01');
  await expect(section.getByLabel('시나리오')).toHaveValue('optimistic');
  await expect(section.locator('[name="currency"]')).toHaveValue('USD');
  for(const [name,value] of [['years','7'],['base_sales','1234.50'],['growth_rate','-10'],['royalty_rate','4.25'],['contribution_rate','80'],['annual_cost','0'],['tax_rate','20'],['discount_rate','9.5']] as const) await expect(section.locator(`[name="${name}"]`)).toHaveValue(value);
  if(label==='금액평가 초안 시험') await expect(section.getByLabel('대상 특허')).toHaveValue('asset2');
  await section.getByLabel('가정의 근거와 출처').fill('연결 오류');
  await section.getByRole('button',{name:button}).click();
  await expect(section.getByRole('alert')).toContainText('저장 여부를 확인');
  await expect(section.locator('[name="annual_cost"]')).toHaveValue('0');
  await section.getByLabel('가정의 근거와 출처').fill('인증 오류');
  await section.getByRole('button',{name:button}).click();
  await expect(section.getByRole('alert')).toContainText('로그인 상태를 확인');
  await expect(section.locator('[name="currency"]')).toHaveValue('USD');
  await section.getByLabel('가정의 근거와 출처').fill('확인된 가정');
  await section.getByRole('button',{name:button}).click();
  await expect(page).toHaveURL(/mock_dcf_saved=1/);
 });
}

for (const [label,button] of [['포트폴리오 생성 시험','포트폴리오 생성'],['포트폴리오 수정 시험','변경 저장']] as const) {
 test(`${label}: portfolio inputs survive save, connection and session errors`, async ({page}) => {
  await page.goto('/');
  const section=page.getByRole('region',{name:label});
  await section.getByLabel('이름').fill('유지할 포트폴리오');
  for(const [value,message] of [['저장 실패','저장하지 못했습니다'],['연결 오류','포트폴리오 목록에서 저장 여부를 확인'],['인증 오류','로그인 상태를 확인']] as const) {
   await section.getByLabel('설명').fill(value);
   await section.getByRole('button',{name:button}).click();
   await expect(section.getByRole('button',{name:'처리 중...'})).toBeDisabled();
   await expect(section.getByRole('alert')).toContainText(message);
   await expect(section.getByLabel('이름')).toHaveValue('유지할 포트폴리오');
   await expect(section.getByLabel('설명')).toHaveValue(value);
  }
  await section.getByLabel('설명').fill('확인된 설명');
  await section.getByRole('button',{name:button}).click();
  await expect(page).toHaveURL(/mock_portfolio_saved=1/);
 });
}
