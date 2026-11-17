import { test,expect } from '@playwright/test';
test('특허별 기여율은 0과 미입력을 구분하고 오류 후 입력을 유지한다',async({page})=>{
 await page.goto('/patent-contribution');const first=page.getByRole('region',{name:'첫 특허'}),second=page.getByRole('region',{name:'둘째 특허'});
 const a=first.getByLabel('첫 특허 기여율 (%)'),b=second.getByLabel('둘째 특허 기여율 (%)');
 await expect(a).toHaveValue('');await expect(b).toHaveValue('0');
 await a.fill('12.34');await first.getByRole('button',{name:'기여율 저장'}).click();await expect(first.getByRole('alert')).toContainText('연결 오류');await expect(a).toHaveValue('12.34');await expect(b).toHaveValue('0');
 await a.fill('17.25');await first.getByRole('button',{name:'기여율 저장'}).click();await expect(first.getByRole('status')).toContainText('저장했습니다');
 await a.fill('');await first.getByRole('button',{name:'기여율 저장'}).click();await expect(first.getByRole('status')).toContainText('저장했습니다');
 await b.fill('101');expect(await b.evaluate(element=>(element as HTMLInputElement).validity.rangeOverflow)).toBe(true);
});
