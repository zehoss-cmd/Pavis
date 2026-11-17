export type CountResult={count:number|null;error:unknown};
export function countValue(result:CountResult):number|null {
 return result.error||result.count===null?null:result.count;
}
