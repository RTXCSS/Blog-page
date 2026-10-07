const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  workers: 1,
  webServer: {
    command: 'node scripts/browser-server.cjs',
    url: 'http://127.0.0.1:18107/api/health',
    reuseExistingServer: false,
    timeout: 90000,
  },
  use: {
    baseURL: 'http://127.0.0.1:18107',
    headless: true,
    channel: 'msedge',
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
});
