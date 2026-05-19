import type { Page } from '@playwright/test';

export async function navigate_to(page: Page, url_string: string) {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';
  await page.goto(`${baseUrl}${url_string}`);
}

export async function fill_input(
  page: Page,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string,
  value_to_type: string
) {
  await page
    .getByRole(aria_role, { name: accessible_name, exact: true })
    .fill(value_to_type);
}

export async function interact_with(
  page: Page,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string
) {
  const locator = page.getByRole(aria_role, {
    name: accessible_name,
    exact: true
  });
  // Playwright's click() is smart enough to handle toggling checkboxes automatically
  await locator.click();
}

type ElementState = 'visible' | 'hidden' | 'enabled' | 'disabled';
export async function verify_element_state(
  page: Page,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string,
  expected_state: ElementState
) {
  const locator = page.getByRole(aria_role, { name: accessible_name });

  if (expected_state === 'hidden') {
    await locator.waitFor({ state: 'hidden' });
  } else {
    // Default to waiting for it to be visible before checking enabled/disabled states
    await locator.waitFor({ state: 'visible' });
  }

  if (expected_state === 'disabled') {
    const isDisabled = await locator.isDisabled();
    if (!isDisabled) throw new Error(`Expected element to be disabled`);
  } else if (expected_state === 'enabled') {
    const isEnabled = await locator.isEnabled();
    if (!isEnabled) throw new Error(`Expected element to be enabled`);
  }
}
