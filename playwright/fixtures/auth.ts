import { Page } from '@playwright/test';
import { isRemoteCluster } from './utils';

export async function login(page: Page, username: string, password: string) {
  console.log(`Logging in as user: ${username}`);

  // Set up console user settings before navigation
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'console-user-settings',
      '{"console.lastPerspective":"admin","console.perspective.visited.admin":true,"console.perspective.visited.dev":true,"console.guidedTour":{"admin":{"completed":true},"dev":{"completed":true}}}',
    );
  });

  // Navigate to the application
  await page.goto('/');

  // Handle the OAuth redirect to console URL Or localhost
  const consoleUrl = process.env.CONSOLE_URL || 'http://localhost:9000';
  const urlMatch = consoleUrl.match(/apps\.([^/]+)/);
  const clusterDomain = urlMatch ? `apps.${urlMatch[1]}` : 'apps-crc.testing';
  const oauthPattern = `https://oauth-openshift.${clusterDomain}/**`;

  console.log(`Waiting for OAuth redirect to: ${oauthPattern}`);

  await page.waitForURL(oauthPattern, {
    timeout: 30000,
  });

  console.log(`Current URL after OAuth redirect: ${page.url()}`);

  // First, check if we need to select an identity provider (htpasswd)
  try {
    const identityProviderButton = page
      .locator('a, button')
      .filter({ hasText: /^htpasswd$/i })
      .first();

    await identityProviderButton.waitFor({ state: 'visible', timeout: 5000 });

    console.log('Identity provider selection found, clicking on htpasswd...');
    await identityProviderButton.click();
    await page.waitForLoadState('domcontentloaded');
  } catch (e) {
    console.log(
      'No identity provider selection found, proceeding directly to login form...',
    );
  }

  // Wait for the login form to be visible
  await page.waitForSelector('input#inputUsername', {
    state: 'visible',
    timeout: 30000,
  });

  console.log('Login form found, filling in credentials...');

  // Fill in login credentials
  await page.locator('input#inputUsername').clear();
  await page.locator('input#inputUsername').fill(username);
  await page.locator('input#inputPassword').fill(password);

  console.log('Credentials filled, submitting login form...');

  // Wait for redirect back to console URL Or localhost
  const redirectPattern = isRemoteCluster()
    ? `${consoleUrl}/**`
    : 'http://localhost:9000/**';

  console.log(`Waiting for redirect to: ${redirectPattern}`);

  try {
    // Click login button and wait for navigation with extended timeout
    const loginButton = page.locator('button[type=submit]:has-text("Log in")');
    await Promise.all([
      page.waitForURL(redirectPattern, { timeout: 90000 }), // 90 second timeout
      loginButton.click(),
    ]);

    console.log(`Successfully redirected to: ${page.url()}`);
  } catch (error) {
    console.log(`Failed to redirect. Current URL: ${page.url()}`);
    console.log(`Error: ${error}`);

    // Check if we're already at the console (maybe already logged in)
    if (
      page.url().includes(consoleUrl) ||
      page.url().includes('localhost:9000')
    ) {
      console.log('Already at console URL, continuing...');
      return;
    }

    throw error;
  }

  // Wait for the page to be fully loaded and interactive
  await page.waitForLoadState('networkidle');
}
