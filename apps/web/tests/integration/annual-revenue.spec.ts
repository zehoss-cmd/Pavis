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
  const shortcuts = page.getByRole('navigation', {name:'제품 상세 바로가기'});
  for (const width of [360, 1280]) {
    await page.setViewportSize({width, height:800});
    await shortcuts.getByRole('link', {name:'관련 특허'}).click();
    await expect(page.locator('#product-patents h2')).toBeInViewport();
    await shortcuts.getByRole('link', {name:'정보 수정'}).click();
    await expect(page.getByLabel('매출 기준연도')).toBeInViewport();
  }
  await page.getByLabel('매출 기준연도').fill('2025');
  await page.getByLabel('해당 연도 매출액').fill('123456');
  await page.getByLabel('통화',{exact:true}).selectOption('KRW');
  await page.getByRole('button',{name:'변경 저장',exact:true}).click();
  await expect(page).toHaveURL(/saved=1/);
  const section=page.getByRole('region',{name:'연도별 매출'});
  await expect(section).toContainText('2025년 · 123,456 KRW');
  await expect(section).toContainText('2024년 · 250 USD');
  await expect(section).toContainText('전년도와 통화가 달라 비교할 수 없습니다.');
  await expect(section).toContainText('전년도 매출 기록 없음');
  const revenueDownload = page.waitForEvent('download');
  await section.getByRole('button', {name:'연도별 매출 CSV 다운로드'}).click();
  const revenueFile = await revenueDownload;
  expect(revenueFile.suggestedFilename()).toBe(`pavis-product-revenue-${product.id}.csv`);
  const revenueStream = await revenueFile.createReadStream();
  if (!revenueStream) throw new Error('Missing annual revenue export');
  const revenueChunks:Buffer[] = [];
  for await (const chunk of revenueStream) revenueChunks.push(Buffer.from(chunk));
  expect(Buffer.concat(revenueChunks).toString('utf8')).toContain('2024,250,"USD","이전 기록","변경으로 검토 종료"');
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
  await expect(page.getByText('전년도와 통화가 달라 비교할 수 없습니다.')).toBeVisible();
  await page.getByRole('link',{name:'2024년 자료 적용'}).click();
  await expect(page.getByText('전년도 매출 기록 없음')).toBeVisible();
  await expect(page.locator('[name=growth_rate]')).toHaveValue('');
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
  const other=await client.from('royalty_dcf_assessments').insert({
    organization_id:org,asset_id:patent.data.id,valuation_date:'2026-01-01',scenario:'optimistic',currency:'USD',
    years:2,base_sales:500,growth_rate:0,royalty_rate:10,contribution_rate:25,annual_cost:0,tax_rate:20,discount_rate:10,
    assumptions:'[TEST] 비교용 매출 가정',
  }).select('id').single();
  if(other.error)throw other.error;
  await page.goto('/account/organizations/'+org+'/valuations/dcf/'+other.data.id);
  await page.getByRole('link',{name:'이 평가를 기준으로 비교'}).click();
  await expect(page.getByLabel('기준 기록',{exact:true})).toHaveValue(other.data.id);
  await expect(page.getByText('비교할 두 번째 기록을 선택해 주세요.')).toBeVisible();
  const search=page.getByLabel('비교 후보 검색');
  await search.fill('기준 초안');
  await expect(page.getByText('검색 결과 1 / 2건',{exact:false})).toBeVisible();
  await expect(page.locator('#first-record optgroup[label="현재 선택"] option')).toHaveAttribute('value',other.data.id);
  await search.fill('no-matching-test-record');
  await expect(page.getByText('검색 결과 0 / 2건',{exact:false})).toBeVisible();
  await expect(page.getByLabel('기준 기록',{exact:true})).toHaveValue(other.data.id);
  await page.getByRole('button',{name:'후보 검색 초기화'}).click();
  await page.getByLabel('기준 기록',{exact:true}).selectOption({label:await page.locator('#first-record option').filter({hasText:'기준 · 초안'}).innerText()});
  await page.getByLabel('비교 기록',{exact:true}).selectOption(other.data.id);
  await page.getByRole('button',{name:'차이 확인'}).click();
  await expect(page.getByRole('heading',{name:'달라진 수치 가정 1개'})).toBeVisible();
  await expect(page.getByText('첫해 매출 · 기준 250 USD · 비교 500 USD')).toBeVisible();
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'두 평가 비교 결과 CSV 다운로드'}).click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toContain('pavis-dcf-comparison-2026-01-01');
  const stream=await download.createReadStream();
  if (!stream) throw new Error('Missing comparison export');
  const chunks:Buffer[]=[];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString('utf8')).toContain('"첫해 매출",250,500,"USD","변경"');
  await page.getByRole('button',{name:'기준·비교 바꾸기'}).click();
  await expect(page.getByRole('button',{name:'두 평가 비교 결과 CSV 다운로드'})).toHaveCount(0);
  await page.getByRole('button',{name:'차이 확인'}).click();
  await expect(page.getByText('첫해 매출 · 기준 500 USD · 비교 250 USD')).toBeVisible();
  await page.getByLabel('비교 기록',{exact:true}).selectOption(other.data.id);
  await expect(page.getByRole('button',{name:'차이 확인'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'두 평가 비교 결과 CSV 다운로드'})).toHaveCount(0);
});
