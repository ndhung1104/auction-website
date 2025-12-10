import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  globalSetup: './tests/global-setup.ts',
  projects: [
    {
      name: 'guest',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'storage-states/guest.json',
      },
    },
    {
      name: 'bidder',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'storage-states/bidder.json',
      },
    },
    {
      name: 'seller',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'storage-states/seller.json',
      },
    },
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'storage-states/admin.json',
      },
    },
  ],
  outputDir: 'test-results',
})
