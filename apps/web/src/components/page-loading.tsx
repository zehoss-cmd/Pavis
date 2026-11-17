/** Neutral skeletons keep the shared workspace usable while route content streams. */
export function PageLoading() {
 return <main className="pavis-page-loading" role="status" aria-live="polite" aria-label="페이지를 불러오는 중입니다">
  <p className="pavis-loading-label">페이지를 불러오는 중입니다</p>
  <div className="pavis-loading-heading" aria-hidden="true"><span/><span/></div>
  <div className="pavis-loading-toolbar" aria-hidden="true"><span/><span/><span/></div>
  <div className="pavis-loading-panel" aria-hidden="true"><span/><span/><span/><span/></div>
  <div className="pavis-loading-panels" aria-hidden="true"><div/><div/></div>
 </main>;
}
