import { connection } from 'next/server';
export default async function Slow(){await connection();await new Promise(resolve=>setTimeout(resolve,1200));return <main><h1>느린 페이지 완료</h1></main>;}
