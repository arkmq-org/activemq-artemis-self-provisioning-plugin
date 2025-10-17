import { defineConfig } from 'cypress';

export default defineConfig({
  retries: 0,
  e2e: {
    baseUrl: 'http://localhost:9000',
    chromeWebSecurity: false,
    video: false,
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
