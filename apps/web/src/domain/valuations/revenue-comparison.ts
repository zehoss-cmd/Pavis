type Revenue = {revenue_year:number;revenue_amount:number;revenue_currency:string};

export function compareAnnualRevenue(current:Revenue, previous?:Revenue):string {
  if (!previous || previous.revenue_year!==current.revenue_year-1) return '전년도 매출 기록 없음';
  if (previous.revenue_currency!==current.revenue_currency) return '전년도와 통화가 달라 비교할 수 없습니다.';
  // Amounts are stored to two decimal places. Subtract minor units to avoid display noise.
  const priorCents=Math.round(previous.revenue_amount*100);
  const changeCents=Math.round(current.revenue_amount*100)-priorCents;
  const amount=new Intl.NumberFormat('ko-KR',{signDisplay:'exceptZero',maximumFractionDigits:2});
  const difference=amount.format(changeCents/100)+' '+current.revenue_currency;
  if (priorCents===0) return `전년 대비 ${difference} · 전년도 매출이 0이어서 증감률 산정 불가`;
  const rate=new Intl.NumberFormat('ko-KR',{style:'percent',signDisplay:'exceptZero',maximumFractionDigits:2});
  return `전년 대비 ${difference} (${rate.format(changeCents/priorCents)})`;
}
