export type CountryCount={country:string;count:number};
export function summarizeCountries(rows:ReadonlyArray<{jurisdiction:string}>):CountryCount[] {
 const counts=new Map<string,number>();
 for(const row of rows) counts.set(row.jurisdiction,(counts.get(row.jurisdiction)||0)+1);
 return [...counts].map(([country,count])=>({country,count})).sort((a,b)=>b.count-a.count||a.country.localeCompare(b.country,'en'));
}
