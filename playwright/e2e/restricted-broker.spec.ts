import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import { toggleRestrictedMode } from '../fixtures/restrictedMode';
import {
  ensureNamespace,
  deleteNamespace,
  scorchedEarthCleanup,
  createE2EClusterInfrastructure,
  createE2ETrustBundleAndOperatorCert,
  cleanupE2EClusterInfrastructure,
} from '../fixtures/k8s';

const username = 'kubeadmin';
const password = process.env.KUBEADMIN_PASSWORD || 'kubeadmin';

// Generate a unique namespace for this test run
const testNamespace = `e2e-test-${Date.now()}`;

test.describe('Restricted Broker End-to-End', () => {
  test.beforeAll(async () => {
    // Scorched earth: clean ALL existing resources before starting
    await scorchedEarthCleanup();

    // Create cluster-level infrastructure (issuers, root CA)
    await createE2EClusterInfrastructure();

    // Create the test namespace
    await ensureNamespace(testNamespace);

    // Create trust bundle and operator cert in test namespace
    await createE2ETrustBundleAndOperatorCert(testNamespace);
  });

  test.afterAll(async () => {
    // Comprehensive cleanup after test
    await deleteNamespace(testNamespace);
    await cleanupE2EClusterInfrastructure();
  });

  test('creates restricted broker with pre-configured certificates', async ({
    page,
  }) => {
    // At this point, we have:
    // - e2e-ca-issuer ClusterIssuer (ready to use)
    // - activemq-artemis-manager-ca trust bundle in our namespace
    // - activemq-artemis-manager-cert operator certificate in our namespace

    // Login
    await login(page, username, password);

    // Navigate to the test namespace's brokers page
    await page.goto(`/k8s/ns/${testNamespace}/brokers`, {
      waitUntil: 'load',
    });
    await page.waitForLoadState('domcontentloaded');

    // Wait for the page to load and click Create Broker
    await expect(
      page.locator('h1, [data-test="resource-title"]', { hasText: /Brokers/i }),
    ).toBeVisible({ timeout: 30000 });

    // Click Create Broker (button or anchor)
    const createBrokerButton = page
      .locator('button, a')
      .filter({ hasText: /^Create Broker$/i })
      .first();
    await createBrokerButton.scrollIntoViewIfNeeded();
    await createBrokerButton.click();

    // Wait for the form to load
    await page.waitForLoadState('domcontentloaded');

    // Enable restricted mode
    await expect(
      page.locator('label:has-text("Restricted mode")').first(),
    ).toBeVisible({ timeout: 10000 });
    await toggleRestrictedMode(page, true);

    // Fill CR Name after toggling restricted mode
    const brokerName = `e2e-broker-${Date.now()}`;
    const nameInput = page.locator(
      '#horizontal-form-name, input[name="horizontal-form-name"]',
    );
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.clear();
    await nameInput.fill(brokerName);

    // Navigate to Control Plane tab
    const controlPlaneTab = page
      .locator('button, a')
      .filter({ hasText: /^Control plane$/i });
    await expect(controlPlaneTab).toBeVisible({ timeout: 10000 });
    await controlPlaneTab.click();

    // Wait for control plane to load
    await expect(
      page.locator('text=/Operator Trust Bundle/i').first(),
    ).toBeVisible({ timeout: 10000 });

    // Step 1: Verify pre-created secrets are detected
    // Wait for the watchers to pick up the existing secrets
    await page.waitForTimeout(5000);

    const operatorCaField = page.locator('input[id="operator-ca-secret"]');

    // Check that operator CA field is populated (from pre-created trust bundle)
    await expect(async () => {
      const operatorCaValue = await operatorCaField.inputValue();
      expect(operatorCaValue).toContain('activemq-artemis-manager-ca');
    }).toPass({ timeout: 30000 });

    // Step 2: Generate Broker Certificate using the UI
    const brokerCertGenerateButton = page
      .locator('button')
      .filter({ hasText: /^Generate$/i })
      .first(); // Only one generate button now (for broker cert)
    await expect(brokerCertGenerateButton).toBeVisible();
    await brokerCertGenerateButton.click();

    // Wait for broker cert modal
    await expect(
      page.locator('text=/Generate Broker Certificate/i'),
    ).toBeVisible({ timeout: 10000 });

    // Select e2e-ca-issuer from the TypeaheadSelect dropdown
    const typeaheadInput = page.locator('input[aria-label="Type to filter"]');
    await expect(typeaheadInput).toBeVisible();
    await typeaheadInput.click();
    await typeaheadInput.fill('e2e-ca-issuer');

    // Wait for the dropdown to filter and show the option
    await page.waitForTimeout(2000);
    const issuerOption = page
      .locator('button:has-text("e2e-ca-issuer")')
      .first();
    await expect(issuerOption).toBeVisible({ timeout: 5000 });
    await issuerOption.click();

    // Confirm broker cert generation
    const confirmBrokerCertButton = page
      .locator('button')
      .filter({ hasText: /^Confirm$/i })
      .first();
    await expect(confirmBrokerCertButton).toBeEnabled({ timeout: 10000 });
    await confirmBrokerCertButton.click();

    // Wait for broker cert to be created
    await page.waitForTimeout(8000);

    // Step 3: Verify broker cert secret is detected
    // The broker cert will be named {brokerName}-broker-cert
    const brokerCertField = page.locator('input[id="broker-cert-secret"]');
    await expect(async () => {
      const brokerCertValue = await brokerCertField.inputValue();
      expect(brokerCertValue).toBe(`${brokerName}-broker-cert`);
    }).toPass({ timeout: 30000 });

    // Step 4: Create the broker
    const createButton = page
      .locator('button')
      .filter({ hasText: /^Create$/i })
      .first();

    // Wait for create button to be enabled
    await expect(createButton).toBeEnabled({ timeout: 15000 });

    // Click create - it will navigate to the brokers list page, not the detail page
    await createButton.click();

    // Wait for navigation to brokers list
    await page.waitForURL(`**/k8s/ns/${testNamespace}/brokers`, {
      timeout: 10000,
    });

    // Wait a moment for the broker to appear in the list
    await page.waitForTimeout(2000);

    // Step 5: Wait for broker to be ready (stay on the list page)
    // The broker should show "5 ok / 5" in the Conditions column
    // Brokers can take 3-5 minutes to fully start up
    await expect(page.locator('text=/5\\s+ok\\s*\\/\\s*5/i')).toBeVisible({
      timeout: 300000,
    }); // 5 minutes timeout for broker startup

    console.log('✅ Broker is ready with 5 OK / 5 status');

    // Step 6: Edit the broker to verify operator config fields are populated
    console.log('Testing broker edit page...');
    const brokerRow = page.locator(`tr:has-text("${brokerName}")`);
    await expect(brokerRow).toBeVisible({ timeout: 10000 });

    // Wait a moment for any UI updates to settle
    await page.waitForTimeout(2000);

    // Find the kebab menu (actions menu) in the broker row
    console.log('Opening kebab menu for edit...');
    const kebabMenuForEdit = brokerRow.locator('button').last();
    await kebabMenuForEdit.scrollIntoViewIfNeeded();
    await kebabMenuForEdit.click({ timeout: 10000 });

    // Wait for dropdown menu to appear
    await page.waitForTimeout(1000);

    console.log('Clicking Edit broker option...');
    const editOption = page
      .locator('a, button')
      .filter({ hasText: /^Edit broker$/i });
    await expect(editOption).toBeVisible({ timeout: 10000 });
    await editOption.click();

    // Wait for edit form to load
    await page.waitForLoadState('domcontentloaded');
    await expect(
      page.locator('label:has-text("Restricted mode")').first(),
    ).toBeVisible({ timeout: 10000 });

    // Verify that the Apply button is enabled
    // If operator config fields are not populated, form validation would fail
    // and the Apply button would be disabled
    console.log('Verifying Apply button is enabled (form is valid)...');
    const applyButton = page
      .locator('button')
      .filter({ hasText: /^Apply$/i })
      .first();
    await expect(applyButton).toBeEnabled({ timeout: 10000 });

    console.log(
      '✅ Apply button is enabled - operator config fields are properly populated!',
    );

    // Navigate back to broker list
    console.log('Returning to broker list...');
    await page.goto(`/k8s/ns/${testNamespace}/brokers`, {
      waitUntil: 'load',
    });
    await page.waitForLoadState('domcontentloaded');

    // Step 7: Delete the broker (from the list page)
    console.log(`Looking for broker row for deletion: ${brokerName}`);
    const brokerRowForDelete = page.locator(`tr:has-text("${brokerName}")`);
    await expect(brokerRowForDelete).toBeVisible({ timeout: 10000 });

    // Wait a moment for any UI updates to settle
    await page.waitForTimeout(2000);

    // Find the kebab menu - it's the last button in the row (actions menu)
    console.log('Clicking kebab menu for deletion...');
    const kebabMenu = brokerRowForDelete.locator('button').last();
    await kebabMenu.scrollIntoViewIfNeeded();
    await kebabMenu.click({ timeout: 10000 });

    // Wait for dropdown menu to appear
    console.log('Waiting for dropdown menu...');
    await page.waitForTimeout(1000);

    console.log('Looking for Delete broker option...');
    const deleteOption = page
      .locator('a, button')
      .filter({ hasText: /^Delete broker$/i });
    await expect(deleteOption).toBeVisible({ timeout: 10000 });
    await deleteOption.click();

    // Confirm deletion in modal - broker deletion uses a simple danger button
    console.log('Clicking Delete button in modal...');
    const confirmDeleteButton = page
      .locator('button.pf-m-danger')
      .filter({ hasText: /^Delete$/i });
    await expect(confirmDeleteButton).toBeVisible({ timeout: 10000 });
    await confirmDeleteButton.click();

    // Verify the broker is no longer in the list
    console.log('Waiting for broker to be deleted...');
    await expect(brokerRowForDelete).not.toBeVisible({
      timeout: 60000,
    });

    console.log('✅ Test completed successfully!');
  });
});
