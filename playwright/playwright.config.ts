import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI || !!process.env.TF_BUILD; // TF_BUILD is set by Azure Pipelines

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  // Retries only in CI: a retry that passes is reported as "flaky", so instability stays visible.
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    // JUnit XML is what the PublishTestResults@2 task in Azure DevOps consumes.
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.APP_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: process.env.API_URL ?? 'https://petstore.swagger.io/v2/' },
    },
    { name: 'ui-chromium', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
    { name: 'ui-firefox', testDir: './tests/ui', use: { ...devices['Desktop Firefox'] } },
  ],
  // Starts the demo front-end before UI tests; reuses it locally if already running.
  webServer: {
    command: 'node ../app/server.js',
    url: 'http://localhost:4173',
    reuseExistingServer: !isCI,
    timeout: 15_000,
  },
});
