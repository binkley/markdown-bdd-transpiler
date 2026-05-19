import type { Page } from '@playwright/test';

export async function navigate_to(page: Page, url_string: string) {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';
  await page.goto(`${baseUrl}${url_string}`);
}

export async function enter_into_field(
  page: Page,
  text_to_type: string,
  field_label: string
) {
  await page.getByLabel(field_label, { exact: true }).fill(text_to_type);
}

type ActionType = 'click' | 'check' | 'uncheck';
export async function interact_with_element(
  page: Page,
  action_type: ActionType,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string
) {
  const locator = page.getByRole(aria_role, {
    name: accessible_name,
    exact: true
  });
  if (action_type === 'click') await locator.click();
  else if (action_type === 'check') await locator.check();
  else if (action_type === 'uncheck') await locator.uncheck();
  else throw new Error(`Unsupported action: ${action_type}`);
}

type ElementState = 'visible' | 'hidden' | 'enabled' | 'disabled';
export async function verify_element_state(
  page: Page,
  expected_state: ElementState,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string
) {
  const locator = page.getByRole(aria_role, { name: accessible_name });
  await locator.waitFor({
    state: expected_state === 'hidden' ? 'hidden' : 'visible'
  });

  if (expected_state === 'disabled') {
    const isDisabled = await locator.isDisabled();
    if (!isDisabled) throw new Error(`Expected element to be disabled`);
  } else if (expected_state === 'enabled') {
    const isEnabled = await locator.isEnabled();
    if (!isEnabled) throw new Error(`Expected element to be enabled`);
  }
}
