import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const username = 'kubeadmin';
const password = process.env.KUBEADMIN_PASSWORD || 'kubeadmin';

test.describe('Broker Navigation and Discoverability', () => {
  let brokerName: string;
  const namespace = 'default';

  // Create a test broker once before all tests run
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await login(page, username, password);

    // Navigate to the brokers list page
    await page.goto('/k8s/all-namespaces/brokers');
    await expect(page.locator('h1', { hasText: /Brokers/i })).toBeVisible();

    // Click the Create Broker button
    await page.getByRole('link', { name: 'Create Broker' }).click();

    // Generate a unique broker name for this test run
    brokerName = `e2e-nav-${Date.now()}`;

    // Fill in the broker name and submit the form
    const nameInput = page.locator('#horizontal-form-name');
    await nameInput.fill(brokerName);

    const createButton = page
      .locator('button')
      .filter({ hasText: /^Create$/i });
    await Promise.all([
      page.waitForURL((url) => !url.pathname.includes('/add-broker')),
      createButton.click(),
    ]);

    // Verify the broker appears in the list (may take up to 5 minutes to provision)
    await page.goto('/k8s/all-namespaces/brokers');
    await expect(page.locator('tr', { hasText: brokerName })).toBeVisible({
      timeout: 300000,
    });

    await context.close();
  });

  // Clean up the test broker after all tests complete
  test.afterAll(async () => {
    if (!brokerName) return;

    // Use Kubernetes API to delete the broker (more reliable than UI-based cleanup)
    try {
      await execAsync(
        `oc delete activemqartemis ${brokerName} -n ${namespace} --ignore-not-found=true`,
      );
    } catch (error) {
      // Ignore errors during cleanup
      console.warn(`⚠️  Failed to cleanup broker ${brokerName}:`, error);
    }
  });

  // Test Scenario 1: Verify users can find a broker via search and navigate to its details page
  test('should find broker via search and navigate to details', async ({
    page,
  }) => {
    await login(page, username, password);

    // Navigate to the search page with ActiveMQArtemis kind filter
    await page.goto(
      `/search/ns/${namespace}?kind=broker.amq.io~v1beta1~ActiveMQArtemis`,
    );

    // Click on the broker name in search results
    await page.locator(`a:has-text("${brokerName}")`).click();

    // Verify we're on the broker details page
    await expect(page).toHaveURL(
      new RegExp(`/k8s/ns/${namespace}/.*${brokerName}`),
    );
    await expect(page.locator('h1', { hasText: brokerName })).toBeVisible();
  });

  // Test Scenario 2: Verify kebab menu contains Edit and Delete options and navigates to edit page
  test('should access edit page via kebab menu', async ({ page }) => {
    await login(page, username, password);
    await page.goto(`/k8s/ns/${namespace}/brokers/${brokerName}`);

    // Open the kebab (three-dot) menu
    await page.locator('[data-testid="broker-toggle-kebab"]').click();

    // Verify both Edit and Delete options are visible
    const editBrokerItem = page
      .locator('a, button')
      .filter({ hasText: /Edit Broker/i });
    await expect(editBrokerItem).toBeVisible();

    const deleteBrokerItem = page
      .locator('a, button')
      .filter({ hasText: /Delete Broker/i });
    await expect(deleteBrokerItem).toBeVisible();

    // Click Edit Broker and verify navigation to edit page
    await editBrokerItem.click();
    await expect(page).toHaveURL(
      new RegExp(`/k8s/ns/${namespace}/edit-broker/${brokerName}`),
    );
  });

  // Test Scenario 3: Verify delete confirmation modal appears and can be cancelled
  test('should show delete option in kebab menu', async ({ page }) => {
    await login(page, username, password);
    await page.goto(`/k8s/ns/${namespace}/brokers/${brokerName}`);

    // Open kebab menu and click Delete Broker
    await page.locator('[data-testid="broker-toggle-kebab"]').click();
    await page
      .locator('a, button')
      .filter({ hasText: /Delete Broker/i })
      .click();

    // Verify the delete confirmation modal appears
    await expect(
      page.locator('[role="dialog"]', { hasText: /Delete/i }),
    ).toBeVisible();

    // Click Cancel to close the modal without deleting
    await page
      .locator('button')
      .filter({ hasText: /Cancel/i })
      .click();

    // Verify modal is closed and broker still exists
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    await expect(page).toHaveURL(`/k8s/ns/${namespace}/brokers/${brokerName}`);
    await expect(page.locator('h1', { hasText: brokerName })).toBeVisible();
  });

  // Test Scenario 4: Verify YAML view shows "edit form" link that navigates to edit page
  test('should display edit form link in YAML view', async ({ page }) => {
    await login(page, username, password);

    // Navigate to broker details via search
    await page.goto(
      `/search/ns/${namespace}?kind=broker.amq.io~v1beta1~ActiveMQArtemis`,
    );
    await page.locator(`a:has-text("${brokerName}")`).click();

    // Click the YAML tab
    const yamlTab = page.locator('a, button').filter({ hasText: /^YAML$/i });
    await yamlTab.click();

    // Verify the read-only mode alert appears
    await expect(
      page.locator('text=/This YAML view is in read-only mode/i'),
    ).toBeVisible();

    // Click the "edit form" link in the alert
    const editFormLink = page
      .locator('button, a')
      .filter({ hasText: /edit form/i });
    await editFormLink.click();

    // Verify we're now on the edit form page
    await expect(page).toHaveURL(
      new RegExp(`/k8s/ns/${namespace}/edit-broker/${brokerName}`),
    );

    // Verify the form is populated with the broker's current values
    const nameInput = page.locator('#horizontal-form-name');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(brokerName);
  });
});
