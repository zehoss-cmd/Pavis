'use client';
import { useEffect } from 'react';

const navigationEvent = 'pavis:before-navigation';

export function allowFormNavigation() {
 return window.dispatchEvent(new Event(navigationEvent, {cancelable:true}));
}

export function useUnsavedChanges(active:boolean) {
 useEffect(() => {
  if (!active) return;
  function confirmNavigation(event:Event) {
   if (!window.confirm('저장하지 않은 변경사항이 있습니다. 이 화면을 나갈까요?')) event.preventDefault();
  }
  function confirmUnload(event:BeforeUnloadEvent) {
   event.preventDefault();
   event.returnValue = true;
  }
  window.addEventListener(navigationEvent, confirmNavigation);
  window.addEventListener('beforeunload', confirmUnload);
  return () => {
   window.removeEventListener(navigationEvent, confirmNavigation);
   window.removeEventListener('beforeunload', confirmUnload);
  };
 }, [active]);
}
