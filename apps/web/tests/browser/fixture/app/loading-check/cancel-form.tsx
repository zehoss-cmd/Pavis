'use client';
export function CancelForm(){return <form method="get" action="/loading-check/slow" onSubmit={event=>event.preventDefault()}><button type="submit">검색 취소 테스트</button></form>;}
