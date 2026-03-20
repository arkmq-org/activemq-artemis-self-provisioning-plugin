import { Page } from '@playwright/test';

export async function login(page: Page) {
  const username = process.env.KUBEADMIN_USERNAME;
  const password = process.env.KUBEADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('Missing OpenShift credentials. Set KUBEADMIN_USERNAME and KUBEADMIN_PASSWORD environment variables.');
  }

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
  
  // First, check if we need to select an identity provider (kube:admin)
  try {
    const identityProviderButton = page.locator('a, button').filter({ hasText: /^htpasswd$/i }).first();

    await identityProviderButton.waitFor({ state: 'visible', timeout: 5000 });
    
    console.log('Identity provider selection found, clicking on kube:admin...');
    await identityProviderButton.click();
    await page.waitForLoadState('domcontentloaded');
  } catch (e) {
    console.log('No identity provider selection found, proceeding directly to login form...');
  }

  // Wait for the login form to be visible
  await page.waitForSelector('input#inputUsername', {
    state: 'visible',
    timeout: 30000
  });

  console.log('Login form found, filling in credentials...');

  // Fill in login credentials
  await page.locator('input#inputUsername').clear();
  await page.locator('input#inputUsername').fill(username);
  await page.locator('input#inputPassword').fill(password);

  console.log('Credentials filled, submitting login form...');

  // Click login button and wait for navigation
  const loginButton = page.locator('button[type=submit]:has-text("Log in")');
  await loginButton.click();

  // Wait for redirect back to console URL Or localhost
  const isRemoteCluster = consoleUrl.startsWith('https://');
  const redirectPattern = isRemoteCluster ? `${consoleUrl}/**` : 'http://localhost:9000/**';
  
  console.log(`Waiting for redirect to: ${redirectPattern}`);
  
  try {
    await page.waitForURL(redirectPattern, { timeout: 60000 });
    console.log(`Successfully redirected to: ${page.url()}`);
  } catch (error) {
    console.log(`Failed to redirect. Current URL: ${page.url()}`);
    throw error;
  }

  // Wait for the page to be fully loaded and interactive
  await page.waitForLoadState('networkidle');
}
