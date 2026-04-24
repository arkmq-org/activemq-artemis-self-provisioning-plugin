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

  // Click login button and wait for navigation
  const loginButton = page.locator('button[type=submit]:has-text("Log in")');

  // Wait for redirect back to console URL Or localhost
  const redirectPattern = isRemoteCluster()
    ? `${consoleUrl}/**`
    : 'http://localhost:9000/**';

  console.log(`Waiting for redirect to: ${redirectPattern}`);

  try {
    // Use Promise.race to handle both navigation and potential errors
    await Promise.race([
      loginButton.click(),
      page.waitForURL(redirectPattern, { timeout: 65000 }),
    ]);

    // Give it a moment to settle
    await page.waitForTimeout(1000);

    // Check if we're at the right URL
    if (!page.url().match(new RegExp(redirectPattern.replace('**', '.*')))) {
      console.log(`Still waiting for redirect. Current URL: ${page.url()}`);
      await page.waitForURL(redirectPattern, { timeout: 30000 });
    }

    console.log(`Successfully redirected to: ${page.url()}`);
  } catch (error) {
    console.log(`Failed to redirect. Current URL: ${page.url()}`);
    console.log(`Error: ${error}`);
    throw error;
  }

  // Wait for the page to be fully loaded and interactive
  await page.waitForLoadState('networkidle');
}
