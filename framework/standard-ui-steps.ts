import type { Page } from '@playwright/test';
import { interpolate } from './interpolation.js';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export async function navigate_to(page: Page, url_string: string) {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';
  await page.goto(`${baseUrl}${interpolate(url_string)}`);
}

export async function fill_input(
  page: Page,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string,
  value_to_type: string
) {
  const finalName = interpolate(accessible_name);
  const finalValue = interpolate(value_to_type);

  const regexName = new RegExp(escapeRegExp(finalName), 'i');
  const locator = page
    .getByRole(aria_role, { name: regexName })
    .locator('visible=true')
    .first();
  await locator.fill(finalValue);
}

export async function interact_with(
  page: Page,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string
) {
  const finalName = interpolate(accessible_name);

  const regexName = new RegExp(escapeRegExp(finalName), 'i');
  const locator = page
    .getByRole(aria_role, { name: regexName })
    .locator('visible=true')
    .first();

  if (aria_role === 'checkbox' || aria_role === 'radio') {
    await locator.click({ force: true });
  } else {
    await locator.click();
  }
}

type ElementState = 'visible' | 'hidden' | 'enabled' | 'disabled';
export async function verify_element_state(
  page: Page,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string,
  expected_state: ElementState
) {
  const finalName = interpolate(accessible_name);

  const regexName = new RegExp(escapeRegExp(finalName), 'i');
  let locator = page.getByRole(aria_role, { name: regexName });

  if (expected_state === 'hidden') {
    await locator.waitFor({ state: 'hidden' });
  } else {
    // For expected visible states, narrow down to the visible instance to avoid strict mode violations from overlapping UI layers
    locator = locator.locator('visible=true').first();
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
