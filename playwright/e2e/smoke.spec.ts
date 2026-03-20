import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Console login smoke', () => {
  test('logs in and lands on console', async ({ page }) => {
    await login(page);
    
    // Check that we're on the console (either localhost or remote cluster)
    const consoleUrl = process.env.CONSOLE_URL || 'http://localhost:9000';
    const isRemoteCluster = consoleUrl.startsWith('https://');
    
    if (isRemoteCluster) {
      // For remote clusters, check we're on the console domain
      await expect(page).toHaveURL(/console-openshift-console\.apps\..*/, { timeout: 30000 });
    } else {
      // For localhost, check for localhost
      await expect(page).toHaveURL(/localhost/, { timeout: 30000 });
    }
    
    // Verify we can see the console UI (dashboards or any console page)
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Create Broker via UI', () => {
  test('logs in, navigates to brokers, creates a broker and then deletes it', async ({
    page,
  }) => {
    // Login
    await login(page);

    // Navigate to all-namespaces brokers page
    await page.goto('/k8s/all-namespaces/brokers', {
      waitUntil: 'load',
    });
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    // Ensure Brokers page loaded - wait for heading with better error handling
    try {
      await expect(
        page.locator('h1, [data-test="resource-title"]').filter({ hasText: /Brokers/i }),
      ).toBeVisible({ timeout: 60000 });
    } catch (error) {
      console.error('Failed to find Brokers heading. Current URL:', page.url());
      console.error('Page title:', await page.title());
      console.error('Visible h1 elements:', await page.locator('h1').allTextContents());
      throw error;
    }

    // Click Create Broker (button or anchor)
    const createBrokerButton = page
      .locator('button, a')
      .filter({ hasText: /^Create Broker$/i })
      .first();
    await createBrokerButton.scrollIntoViewIfNeeded();
    await createBrokerButton.click();

    // Wait for form to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // NOW fill CR Name with a unique value (after switching modes)
    const brokerName = `e2e-broker-${Date.now()}`;
    const nameInput = page.locator(
      '#horizontal-form-name, input[name="horizontal-form-name"]',
    );
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.clear();
    await nameInput.fill(brokerName);
    
    // Trigger validation by pressing Tab or clicking outside
    await nameInput.press('Tab');
    await page.waitForTimeout(1000);

    // Click Create and wait for the creation to start
    const createButton = page
      .locator('button')
      .filter({ hasText: /^Create$/i });

    // Wait for button to be enabled with better error handling
    try {
      await expect(createButton).toBeEnabled({ timeout: 30000 });
    } catch (error) {
      console.error('Create button not enabled. Checking form state...');
      console.error('Name input value:', await nameInput.inputValue());
      console.error('Button state:', await createButton.getAttribute('disabled'));
      console.error('Button classes:', await createButton.getAttribute('class'));
      throw error;
    }

    // Click and wait for navigation away from the form (indicates successful submission)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/add-broker'), {
        timeout: 30000,
      }),
      createButton.click(),
    ]);

    // Wait a bit more for the broker to be created in K8s
    await page.waitForTimeout(2000);

    // Navigate to all-namespaces brokers page to check the status
    await page.goto('/k8s/all-namespaces/brokers', {
      waitUntil: 'load',
    });
    await page.waitForLoadState('domcontentloaded');

    // Wait for broker to be there
    await expect(
      page.locator('tr').filter({ hasText: brokerName }),
    ).toBeVisible({
      timeout: 300000,
    });

    // Navigate to broker details page
    await page.goto(`/k8s/ns/default/brokers/${brokerName}`, {
      waitUntil: 'load',
    });
    await page.waitForLoadState('domcontentloaded');

    // Check we are on the details page - wait for the heading containing the broker name
    await expect(page.locator('h1', { hasText: brokerName })).toBeVisible({
      timeout: 30000,
    });

    // click on the kebab toggle
    const kebabToggle = page.locator('[data-testid="broker-toggle-kebab"]');
    await expect(kebabToggle).toBeVisible();
    await kebabToggle.click();

    // click on delete broker
    const deleteLink = page
      .locator('a, button')
      .filter({ hasText: /^Delete broker$/i });
    await expect(deleteLink).toBeVisible();
    await deleteLink.click();

    // click on delete in the modal
    const deleteButton = page
      .locator('button.pf-m-danger')
      .filter({ hasText: /^Delete$/i });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Check broker is deleted. We should be on the brokers list page after deletion.
    await expect(
      page
        .locator('h1, [data-test="resource-title"]')
        .filter({ hasText: /Brokers/i }),
    ).toBeVisible();
    await expect(page.locator('body')).not.toContainText(brokerName, {
      timeout: 30000,
    });
  });
});
