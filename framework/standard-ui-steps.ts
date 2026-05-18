import type { Page } from 'playwright';

export async function navigate_to(page: Page, url_string: string) {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';
  await page.goto(`${baseUrl}${url_string}`);
}

export async function enter_into_field(page: Page, text_to_type: string, field_label: string) {
  await page.getByLabel(field_label, { exact: true }).fill(text_to_type);
}

export async function click_button(page: Page, button_text: string) {
  await page.getByRole('button', { name: button_text, exact: true }).click();
}

export async function verify_heading(page: Page, heading_text: string) {
  await page.getByRole('heading', { name: heading_text }).waitFor({ state: 'visible' });
}
