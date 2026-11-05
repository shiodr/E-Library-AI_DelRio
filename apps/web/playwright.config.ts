import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    channel: 'chrome',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, env: { VITE_API_BASE_URL: 'http://127.0.0.1:8000/api/v1' } },
    {
      command: `${process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python'} -m uvicorn app.main:app --host 127.0.0.1 --port 8000`,
      cwd: '../../backend', url: 'http://127.0.0.1:8000/api/v1/health', reuseExistingServer: !process.env.CI,
      env: { OPENAI_API_KEY: '' },
    },
  ],
})
