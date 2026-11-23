import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5183',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/*.mobile.spec.js'],
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      testMatch: ['**/*.mobile.spec.js'],
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
