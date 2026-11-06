import { defineConfig } from '@playwright/test'

const database = process.env.DATABASE_URL
if (!database || !/^postgresql\+pg8000:\/\/[^/]*@(127\.0\.0\.1|localhost):\d+\/[^?]*_test(?:\?.*)?$/.test(database)) {
  throw new Error('Cross-site session tests require DATABASE_URL for a loopback PostgreSQL database ending in _test.')
}

export default defineConfig({
  testDir: './cross-site-e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: 'https://elibrary-ai.wasmer.app',
    channel: 'chrome',
    ignoreHTTPSErrors: true,
    launchOptions: { args: [
      '--no-proxy-server',
      '--host-resolver-rules=MAP elibrary-ai.wasmer.app 127.0.0.1:8443, MAP backend-shiodr.wasmer.app 127.0.0.1:8443',
      '--test-third-party-cookie-phaseout',
    ] },
  },
  webServer: {
    command: '.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8001',
    cwd: '../../backend',
    url: 'http://127.0.0.1:8001/api/v1/health',
    reuseExistingServer: false,
    env: {
      DATABASE_URL: database,
      DB_SSL: 'false', APP_ENV: 'test', OPENAI_API_KEY: '',
      SESSION_TOKEN_SECRET: 'cross-site-test-only-secret-never-use-in-production',
      SESSION_COOKIE_SECURE: 'true', SESSION_COOKIE_SAMESITE: 'none',
      CORS_ORIGINS: '["https://elibrary-ai.wasmer.app"]',
    },
  },
})
