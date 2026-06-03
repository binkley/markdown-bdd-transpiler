import type { Page } from '@playwright/test';
import { interpolate } from './interpolation.js';

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export async function navigate_to(page: Page, url_string: string) {
  await page.goto(interpolate(url_string));
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

export async function interact_with_text(page: Page, visible_text: string) {
  const finalText = interpolate(visible_text);
  const regexText = new RegExp(escapeRegExp(finalText), 'i');

  const locator = page.getByText(regexText).locator('visible=true').first();

  await locator.click();
}

type ElementState = 'visible' | 'hidden' | 'enabled' | 'disabled';

async function assert_locator_state(
  locator: ReturnType<Page['locator']>,
  expected_state: ElementState
) {
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

export async function verify_element_state(
  page: Page,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string,
  expected_state: ElementState
) {
  const finalName = interpolate(accessible_name);
  const regexName = new RegExp(escapeRegExp(finalName), 'i');
  const locator = page.getByRole(aria_role, { name: regexName });
  await assert_locator_state(locator, expected_state);
}

export async function verify_text_state(
  page: Page,
  visible_text: string,
  expected_state: ElementState
) {
  const finalText = interpolate(visible_text);
  const regexText = new RegExp(escapeRegExp(finalText), 'i');
  const locator = page.getByText(regexText);
  await assert_locator_state(locator, expected_state);
}

export async function verify_testid_state(
  page: Page,
  test_id: string,
  expected_state: ElementState
) {
  const finalTestId = interpolate(test_id);
  const locator = page.getByTestId(finalTestId);
  await assert_locator_state(locator, expected_state);
}

export async function interact_with_testid(page: Page, test_id: string) {
  const finalTestId = interpolate(test_id);
  const locator = page
    .getByTestId(finalTestId)
    .locator('visible=true')
    .first();
  await locator.click();
}

export async function fill_input_testid(
  page: Page,
  test_id: string,
  value_to_type: string
) {
  const finalTestId = interpolate(test_id);
  const finalValue = interpolate(value_to_type);
  const locator = page
    .getByTestId(finalTestId)
    .locator('visible=true')
    .first();
  await locator.fill(finalValue);
}
