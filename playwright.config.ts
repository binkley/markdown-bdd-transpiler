import { defineConfig, devices } from '@playwright/test';

// Set default environment variables for the dynamic data injection tests.
// This ensures the tests pass whether running locally or in Docker.
process.env.TEST_DYNAMIC_USER =
  process.env.TEST_DYNAMIC_USER || 'frontend_wizard';
process.env.TEST_DYNAMIC_PATH = process.env.TEST_DYNAMIC_PATH || '/login';

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
