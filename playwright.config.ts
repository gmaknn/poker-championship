import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/recipe',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.RECIPE_BASE_URL || 'http://localhost:3003',
    trace: 'on-first-retry',
    headless: process.env.RECIPE_HEADLESS !== 'false',
  },
  timeout: 120000,
});
