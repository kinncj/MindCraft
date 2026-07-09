import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  // Generous: CI and headless runs use SwiftShader, which renders the
  // 3D world at a handful of frames per second.
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  // CI runners have two cores; more workers just makes every page slow
  // enough to trip timeouts.
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
