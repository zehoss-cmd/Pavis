import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'.',
  testMatch:'quality.spec.ts',
  timeout:120_000,
  workers:1,
  use:{actionTimeout:20_000,baseURL:'http://127.0.0.1:3200',viewport:{width:390,height:844}},
  webServer:{
    command:'npm run dev -- --hostname 127.0.0.1 --port 3200',
    cwd:process.cwd(),
    url:'http://127.0.0.1:3200/login',
    timeout:120_000,
  },
});
