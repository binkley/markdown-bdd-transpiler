import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './.generated',
  timeout: 30000,
  fullyParallel: true,
  reporter: process.env.PLAYWRIGHT_REPORTER || 'list',
  use: {
    // Fail tests quickly if action takes too long
    actionTimeout: 10000,
    // Automatically capture a screenshot if a test fails
    screenshot: 'only-on-failure',
    // We handle the base URL dynamically in standard-ui-steps or we can set it here
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:5173'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
