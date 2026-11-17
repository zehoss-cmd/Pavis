import { connection } from 'next/server';
export default async function Organization(){await connection();await new Promise(resolve=>setTimeout(resolve,1200));return <main><h1>선택한 조직 화면</h1></main>;}
