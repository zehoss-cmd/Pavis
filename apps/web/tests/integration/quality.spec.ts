import {randomUUID} from 'node:crypto';
import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

test('인증된 테스트 조직의 전체 건수와 현재 페이지 건수를 구분하고 누락된 권리자를 수정한다',async ({page})=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url!=='http://127.0.0.1:54321' || !key) throw new Error('Requires the disposable local Supabase stack');
  const client=createClient(url,key);
  const email='quality-'+randomUUID()+'@example.com';
  const password='Qa9'+randomUUID();
  const signup=await client.auth.signUp({email,password});
  if (signup.error) throw signup.error;
  const {data:org,error}=await client.rpc('create_organization',{org_name:'Quality test'});
  if (error) throw error;
  const rows=Array.from({length:251},(_,i)=>({
    organization_id:org,title:'검증 특허 '+i,jurisdiction:'US',rights_holder:i===0?null:'테스트 회사',
  }));
  const seeded=await client.from('patent_assets').insert(rows);
  if (seeded.error) throw seeded.error;

  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in'}).click();
  await expect(page).toHaveURL(/\/account$/, {timeout:60_000});
  await page.goto('/account/organizations/'+org+'/patents/quality');
  await expect(page.getByLabel('현재 페이지 점검 요약')).toContainText('점검 대상 25건');
  await page.getByRole('link',{name:'조직 전체 점검',exact:true}).click();
  await expect(page.getByLabel('조직 전체 점검 요약')).toContainText('점검 대상 251건',{timeout:30_000});
  await page.getByLabel('점검 항목',{exact:true}).selectOption('7');
  await expect(page.getByRole('heading',{name:'보완할 특허 1건'})).toBeVisible();
  await page.getByRole('link',{name:/검증 특허 0 ·/}).click();
  await page.locator('input[name="rights_holder"]').fill('확인된 권리자');
  await page.locator('form').filter({has:page.locator('input[name="rights_holder"]')}).getByRole('button',{name:/저장/}).click();
  await expect(page).toHaveURL(/saved=1/);
  await page.getByRole('link',{name:'품질 점검으로 돌아가기'}).click();
  await expect(page.getByRole('heading',{name:'보완할 특허 0건'})).toBeVisible({timeout:30_000});
  await expect(page.getByLabel('조직 전체 점검 요약')).toContainText('점검 대상 251건');
});
