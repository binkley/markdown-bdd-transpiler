import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['.generated/**/*.test.ts'],
    testTimeout: 30000
  }
});
