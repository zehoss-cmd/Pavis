export const productPatentSearchFields={title:'특허명',application_number:'출원번호',jurisdiction:'국가 코드'} as const;
export type ProductPatentSearchField=keyof typeof productPatentSearchFields;
export function parseProductPatentSearchField(value:unknown):ProductPatentSearchField {
 return typeof value==='string'&&Object.hasOwn(productPatentSearchFields,value)?value as ProductPatentSearchField:'title';
}
