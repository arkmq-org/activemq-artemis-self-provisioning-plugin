import { defineConfig } from 'cypress';

export default defineConfig({
  retries: 2,
  e2e: {
    baseUrl: 'http://localhost:9000',
    chromeWebSecurity: false,
    video: false,
    defaultCommandTimeout: 120000,
    pageLoadTimeout: 120000,
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
