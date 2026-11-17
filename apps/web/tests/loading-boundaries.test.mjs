import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../src/app/',import.meta.url);
function pages(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?pages(join(path,entry.name)):entry.name==='page.tsx'?[path]:[]);}
test('모든 페이지 경로는 공통 로딩 경계를 가진다',()=>{
 const missing=pages(root.pathname).filter(directory=>!existsSync(join(directory,'loading.tsx')));
 assert.deepEqual(missing,[]);
});
