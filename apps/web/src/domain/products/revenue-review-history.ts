export const reviewHistoryPageSize=25;
export const reviewHistoryMaxPage=1000;
export function reviewHistoryPage(value:unknown):number {
 if(typeof value!=='string'||!/^[1-9]\d{0,3}$/.test(value))return 1;
 return Math.min(Number(value),reviewHistoryMaxPage);
}
export function reviewStatusLabel(status:string):string {
 return ({pending:'검토 대기',reviewed:'운영자 검토 완료',needs_info:'추가 자료 요청',superseded:'변경으로 검토 종료'} as Record<string,string>)[status]||'상태 확인 필요';
}
export function reviewAppliesToCurrent(reviewRevision:number,currentRevision:number):boolean {
 return reviewRevision===currentRevision;
}

export function isSelfReview(requesterId:string,reviewerId:string|null):boolean {return reviewerId!==null&&requesterId===reviewerId;}
