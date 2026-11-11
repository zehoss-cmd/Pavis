export default function WorkspaceLoading() {
  return <main className="workspace-loading" role="status" aria-live="polite">
    <span className="loading-spinner" aria-hidden="true" />
    <p>화면을 불러오고 있습니다</p>
    <div className="loading-skeleton" aria-hidden="true"><span /><span /><span /></div>
  </main>;
}
