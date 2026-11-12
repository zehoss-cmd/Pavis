import { defineConfig } from '@playwright/test';

export default defineConfig({
 testDir: '.',
 testMatch: '**/*.spec.ts',
 fullyParallel: true,
 forbidOnly: !!process.env.CI,
 retries: process.env.CI ? 1 : 0,
 reporter: 'list',
 use: {
  baseURL: 'http://127.0.0.1:3198',
  browserName: 'chromium',
  launchOptions: process.env.PAVIS_CHROMIUM_PATH ? {executablePath:process.env.PAVIS_CHROMIUM_PATH} : {},
 },
 projects: [
  {name:'mobile',use:{viewport:{width:375,height:850}}},
  {name:'desktop',use:{viewport:{width:1440,height:900}}},
 ],
 webServer: {
  command: 'npx next dev fixture --hostname 127.0.0.1 --port 3198',
  url: 'http://127.0.0.1:3198',
  reuseExistingServer: false,
  timeout: 120_000,
  env: {NEXT_TELEMETRY_DISABLED:'1'},
 },
});
