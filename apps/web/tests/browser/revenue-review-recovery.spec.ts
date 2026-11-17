import { test,expect } from '@playwright/test';
test('요청 오류 후 입력 근거를 보존하고 수정 후 재시도한다',async({page})=>{
 await page.goto('/review-recovery');const section=page.getByRole('region',{name:'검토 요청'}),evidence=section.getByLabel('매출 근거 설명');
 await evidence.fill('연결 오류');await section.getByRole('button',{name:'운영자 검토 요청'}).click();
 await expect(section.getByRole('alert')).toContainText('처리됐을 수');await expect(evidence).toHaveValue('연결 오류');
 await evidence.fill('중복 요청');await section.getByRole('button',{name:'운영자 검토 요청'}).click();
 await expect(section.getByRole('alert')).toContainText('이미 검토 대기');await expect(evidence).toHaveValue('중복 요청');
 await evidence.fill('근거 문서 수정');await section.getByRole('button',{name:'운영자 검토 요청'}).click();await expect(page).toHaveURL(/result=requested/);
});
test('운영자 오류 후 의견을 보존하고 두 결과를 각각 제출한다',async({page})=>{
 await page.goto('/review-recovery');const section=page.getByRole('region',{name:'검토 결정'}),note=section.getByLabel('검토 의견');
 await note.fill('처리된 요청');await section.getByRole('button',{name:'검토 완료'}).click();
 await expect(section.getByRole('alert')).toContainText('이미 처리된');await expect(note).toHaveValue('처리된 요청');
 await note.fill('추가 근거가 필요합니다');await section.getByRole('button',{name:'추가 자료 요청'}).click();await expect(page).toHaveURL(/result=needs_info/);
 await page.goto('/review-recovery');await note.fill('자료를 확인했습니다');await section.getByRole('button',{name:'검토 완료'}).click();await expect(page).toHaveURL(/result=reviewed/);
});
