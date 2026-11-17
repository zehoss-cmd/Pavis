export type RevenueReviewFormError='invalid'|'pending'|'stale'|'forbidden'|'session'|'network'|'save';
export type RevenueReviewFormState={error:RevenueReviewFormError|null};
export function classifyReviewError(code:string|undefined):RevenueReviewFormError {
 if(code==='23505')return 'pending';
 if(code==='P0002')return 'stale';
 if(code==='42501')return 'forbidden';
 if(code==='22023')return 'invalid';
 return 'save';
}
