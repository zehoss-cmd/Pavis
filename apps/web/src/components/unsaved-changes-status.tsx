import { useUnsavedChanges } from './unsaved-changes';

export function UnsavedChangesStatus({active}:{active:boolean}) {
 useUnsavedChanges(active);
 return <p role="status">{active ? '저장하지 않은 변경사항이 있습니다.' : ''}</p>;
}
