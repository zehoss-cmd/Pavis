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
