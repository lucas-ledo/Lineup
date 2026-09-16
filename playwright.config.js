import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './test/visual',
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 8_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: 'http://127.0.0.1:5175',
    colorScheme: 'light',
    locale: 'es-ES',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 5175',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
