import { Page, expect } from '@playwright/test';

/**
 * Toggles the restricted mode switch to the desired state.
 * Handles the confirmation modal and retries if the toggle doesn't stick.
 *
 * @param page - The Playwright page object
 * @param enabled - Whether restricted mode should be enabled (true) or disabled (false)
 */
export async function toggleRestrictedMode(
  page: Page,
  enabled: boolean,
): Promise<void> {
  const restrictedSwitch = page.locator(
    'input#restricted-mode[type="checkbox"]',
  );
  await restrictedSwitch.scrollIntoViewIfNeeded();
  await expect(restrictedSwitch).toBeVisible({ timeout: 10000 });

  // Check current state
  const isCurrentlyChecked = await restrictedSwitch.isChecked();

  // If already in the desired state, nothing to do
  if (isCurrentlyChecked === enabled) {
    return;
  }

  // Toggle the switch
  const switchLabel = page.locator('label[for="restricted-mode"]');
  const continueButton = page
    .locator('button.pf-m-danger')
    .filter({ hasText: /Continue/i });

  await switchLabel.click();

  // Wait for confirmation modal to appear
  await expect(
    page.locator('text=/Switch to\\/from restricted mode?/i'),
  ).toBeVisible({ timeout: 10000 });

  // Click the Continue button to confirm
  await expect(continueButton).toBeVisible();
  await continueButton.click();

  // Wait for modal to close
  await expect(
    page.locator('text=/Switch to\\/from restricted mode?/i'),
  ).not.toBeVisible({ timeout: 10000 });

  // Wait for the page to settle
  await page.waitForTimeout(1000);

  // Verify it actually toggled - if not, try once more
  const isCheckedAfterToggle = await restrictedSwitch.isChecked();
  if (isCheckedAfterToggle !== enabled) {
    await switchLabel.click();
    await expect(
      page.locator('text=/Switch to\\/from restricted mode?/i'),
    ).toBeVisible({ timeout: 10000 });
    await continueButton.click();
    await expect(
      page.locator('text=/Switch to\\/from restricted mode?/i'),
    ).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
  }

  // Final verification
  if (enabled) {
    await expect(restrictedSwitch).toBeChecked({ timeout: 5000 });
  } else {
    await expect(restrictedSwitch).not.toBeChecked({ timeout: 5000 });
  }
}

/**
 * Waits for the restricted mode switch to be in a specific state.
 * Useful when the form defaults to a certain mode.
 *
 * @param page - The Playwright page object
 * @param enabled - Whether to wait for enabled (true) or disabled (false) state
 */
export async function waitForRestrictedMode(
  page: Page,
  enabled: boolean,
): Promise<void> {
  const restrictedSwitch = page.locator(
    'input#restricted-mode[type="checkbox"]',
  );
  await restrictedSwitch.scrollIntoViewIfNeeded();
  await expect(restrictedSwitch).toBeVisible({ timeout: 10000 });

  if (enabled) {
    await expect(restrictedSwitch).toBeChecked({ timeout: 5000 });
  } else {
    await expect(restrictedSwitch).not.toBeChecked({ timeout: 5000 });
  }
}
