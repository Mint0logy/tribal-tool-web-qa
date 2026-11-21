import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir: './tests',

  timeout: 30_000,

  expect: {
    timeout: 5_000
  },

  fullyParallel: false,

  retries: 0,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['./reporters/html-reporter.ts'],
  ],
  
  outputDir: 'test-results',

  use: {
    baseURL: process.env.BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})