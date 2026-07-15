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

export async function interact_with_exact_text(
  page: Page,
  exact_text: string
) {
  const finalText = interpolate(exact_text);
  const locator = page
    .getByText(finalText, { exact: true })
    .locator('visible=true')
    .first();
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

export async function verify_exact_text_state(
  page: Page,
  exact_text: string,
  expected_state: ElementState
) {
  const finalText = interpolate(exact_text);
  const locator = page.getByText(finalText, { exact: true });
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

export async function interact_with_nth_element(
  page: Page,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string,
  index_or_ordinal: string | number
) {
  const finalName = interpolate(accessible_name);
  const regexName = new RegExp(escapeRegExp(finalName), 'i');

  let i = 0;
  if (typeof index_or_ordinal === 'number') {
    // If it's already a number, assume it's 1-based from the user or 0-based.
    // Let's assume the LLM passes 1 for "1st". So subtract 1.
    i = index_or_ordinal > 0 ? index_or_ordinal - 1 : 0;
  } else {
    // Parse "1st", "2nd", "3", etc.
    const match = index_or_ordinal.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      i = parsed > 0 ? parsed - 1 : 0;
    }
  }

  const locator = page
    .getByRole(aria_role, { name: regexName })
    .locator('visible=true')
    .nth(i);

  if (aria_role === 'checkbox' || aria_role === 'radio') {
    await locator.click({ force: true });
  } else {
    await locator.click();
  }
}

export async function verify_element_count(
  page: Page,
  aria_role: Parameters<Page['getByRole']>[0],
  accessible_name: string,
  expected_count: number
) {
  const finalName = interpolate(accessible_name);
  const regexName = new RegExp(escapeRegExp(finalName), 'i');
  const locator = page
    .getByRole(aria_role, { name: regexName })
    .locator('visible=true');

  const count =
    typeof expected_count === 'string'
      ? parseInt(expected_count, 10)
      : expected_count;

  // Custom polling for count since standard tests don't import expect
  const start = Date.now();
  const timeout = 5000;
  let currentCount = await locator.count();

  while (currentCount !== count && Date.now() - start < timeout) {
    await page.waitForTimeout(100); // 100ms polling
    currentCount = await locator.count();
  }

  if (currentCount !== count) {
    throw new Error(
      `Expected exactly ${count} visible elements matching role '${aria_role}' and name '${finalName}', but found ${currentCount}`
    );
  }
}

export async function dismiss_if_present(
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

  try {
    await locator.click({ timeout: 2000 });
  } catch {
    // Ignored on purpose: the element isn't present
  }
}
