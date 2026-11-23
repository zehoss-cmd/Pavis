import {randomUUID} from 'node:crypto';
import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

test('지난 연도 매출을 유지하고 검토 이력과 수정 화면으로 연결한다',async ({page})=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url!=='http://127.0.0.1:54321' || !key) throw new Error('Requires the disposable local Supabase stack');
  const client=createClient(url,key);
  const email='revenue-'+randomUUID()+'@example.com';
  const password='Qa9'+randomUUID();
  const signup=await client.auth.signUp({email,password});
  if (signup.error) throw signup.error;
  const {data:org,error:orgError}=await client.rpc('create_organization',{org_name:'Annual revenue test'});
  if (orgError) throw orgError;
  const {data:product,error}=await client.from('product_assets').insert({
    organization_id:org,name:'매출 이력 제품',revenue_year:2024,revenue_amount:250,revenue_currency:'USD',
  }).select('id').single();
  if (error) throw error;
  const request=await client.rpc('request_product_revenue_review',{p_org:org,p_product:product.id,p_evidence:'2024년 테스트 자료'});
  if (request.error) throw request.error;

  const patent=await client.from('patent_assets').insert({organization_id:org,title:'평가 대상',jurisdiction:'US'}).select('id').single();
  if (patent.error) throw patent.error;
  const link=await client.from('product_patent_links').insert({organization_id:org,product_id:product.id,patent_id:patent.data.id});
  if (link.error) throw link.error;
  const rate=await client.from('product_patent_links').update({contribution_rate:25}).eq('product_id',product.id).eq('patent_id',patent.data.id);
  if (rate.error) throw rate.error;

  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Sign in'}).click();
  await expect(page).toHaveURL(/\/account$/, {timeout:60_000});
  await page.goto('/account/organizations/'+org+'/products/'+product.id);
  await page.getByLabel('매출 기준연도').fill('2025');
  await page.getByLabel('해당 연도 매출액').fill('123456');
  await page.getByLabel('통화',{exact:true}).selectOption('KRW');
  await page.getByRole('button',{name:'변경 저장',exact:true}).click();
  await expect(page).toHaveURL(/saved=1/);
  const section=page.getByRole('region',{name:'연도별 매출'});
  await expect(section).toContainText('2025년 · 123,456 KRW');
  await expect(section).toContainText('2024년 · 250 USD');
  const prior=section.getByRole('listitem').filter({hasText:'2024년'});
  await expect(prior).toContainText('변경으로 검토 종료');
  await prior.getByRole('link',{name:'검토 이력 보기'}).click();
  await expect(page.getByRole('heading',{name:'2024년 매출 검토 이력'})).toBeVisible();
  await expect(page.getByText('2024년 테스트 자료')).toBeVisible();
  await page.getByRole('link',{name:'제품 상세로',exact:true}).click();
  await prior.getByRole('link',{name:'정보 수정에 불러오기'}).click();
  await expect(page.getByLabel('매출 기준연도')).toHaveValue('2024');
  await expect(page.getByLabel('해당 연도 매출액')).toHaveValue('250');
  await expect(page.getByLabel('통화',{exact:true})).toHaveValue('USD');
  await page.getByRole('link',{name:'제품 매출로 금액평가 작성'}).click();
  await page.getByRole('link',{name:'2024년 자료 적용'}).click();
  await expect(page.locator('[name=base_sales]')).toHaveValue('250');
  await expect(page.locator('[name=currency]')).toHaveValue('USD');
  await expect(page.locator('[name=contribution_rate]')).toHaveValue('25');
  await expect(page.locator('[name=assumptions]')).toContainText('2024년');
  for(const [name,value] of Object.entries({valuation_date:'2026-01-01',years:'2',growth_rate:'0',royalty_rate:'10',annual_cost:'0',tax_rate:'20',discount_rate:'10'})){
    await page.locator('[name='+name+']').fill(value);
  }
  await page.getByRole('button',{name:'초안 저장 및 계산'}).click();
  await expect(page).toHaveURL(/create=1/);
  const draft=await client.from('royalty_dcf_assessments').select('base_sales,currency,contribution_rate,status').eq('asset_id',patent.data.id).single();
  expect(draft.data).toEqual({base_sales:250,currency:'USD',contribution_rate:25,status:'draft'});
});
