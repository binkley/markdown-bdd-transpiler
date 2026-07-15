import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  navigate_to,
  fill_input,
  interact_with,
  interact_with_text,
  interact_with_exact_text,
  interact_with_testid,
  fill_input_testid,
  verify_element_state,
  verify_text_state,
  verify_exact_text_state,
  verify_testid_state,
  interact_with_nth_element,
  verify_element_count,
  dismiss_if_present
} from '../../framework/standard-ui-steps.js';

describe('Standard UI Steps', () => {
  let mockLocator: any;
  let mockPage: any;

  beforeEach(() => {
    mockLocator = {
      locator: mock.fn(() => mockLocator),
      first: mock.fn(() => mockLocator),
      nth: mock.fn(() => mockLocator),
      click: mock.fn(async () => {}),
      fill: mock.fn(async () => {}),
      waitFor: mock.fn(async () => {}),
      isDisabled: mock.fn(async () => true),
      isEnabled: mock.fn(async () => true),
      count: mock.fn(async () => 1)
    };

    mockPage = {
      goto: mock.fn(async () => {}),
      getByRole: mock.fn(() => mockLocator),
      getByText: mock.fn(() => mockLocator),
      getByTestId: mock.fn(() => mockLocator),
      waitForLoadState: mock.fn(async () => {}),
      waitForTimeout: mock.fn(async () => {})
    };
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('navigate_to', () => {
    it('navigates to the specified URL', async () => {
      await navigate_to(mockPage, '/dashboard');
      assert.equal(mockPage.goto.mock.calls.length, 1);
      assert.equal(mockPage.goto.mock.calls[0].arguments[0], '/dashboard');
    });
  });

  describe('interact_with', () => {
    it('clicks a standard role', async () => {
      await interact_with(mockPage, 'button', 'Submit');
      assert.equal(mockPage.getByRole.mock.calls.length, 1);
      assert.equal(mockPage.getByRole.mock.calls[0].arguments[0], 'button');
      assert.equal(mockLocator.click.mock.calls.length, 1);
      assert.deepEqual(mockLocator.click.mock.calls[0].arguments, []);
    });

    it('forces click on checkbox or radio', async () => {
      await interact_with(mockPage, 'checkbox', 'Accept');
      assert.equal(mockLocator.click.mock.calls.length, 1);
      assert.deepEqual(mockLocator.click.mock.calls[0].arguments[0], {
        force: true
      });
    });
  });

  describe('interact_with_text', () => {
    it('clicks by text', async () => {
      await interact_with_text(mockPage, 'Click Me');
      assert.equal(mockPage.getByText.mock.calls.length, 1);
      assert.equal(mockLocator.click.mock.calls.length, 1);
    });
  });

  describe('interact_with_exact_text', () => {
    it('clicks by exact text', async () => {
      await interact_with_exact_text(mockPage, 'Exact Click Me');
      assert.equal(mockPage.getByText.mock.calls.length, 1);
      assert.deepEqual(mockPage.getByText.mock.calls[0].arguments, [
        'Exact Click Me',
        { exact: true }
      ]);
      assert.equal(mockLocator.click.mock.calls.length, 1);
    });
  });

  describe('interact_with_testid', () => {
    it('clicks by testid', async () => {
      await interact_with_testid(mockPage, 'submit-btn');
      assert.equal(mockPage.getByTestId.mock.calls.length, 1);
      assert.equal(
        mockPage.getByTestId.mock.calls[0].arguments[0],
        'submit-btn'
      );
      assert.equal(mockLocator.click.mock.calls.length, 1);
    });
  });

  describe('fill_input', () => {
    it('fills an input located by role', async () => {
      await fill_input(mockPage, 'textbox', 'Username', 'testuser');
      assert.equal(mockPage.getByRole.mock.calls.length, 1);
      assert.equal(mockLocator.fill.mock.calls.length, 1);
      assert.equal(mockLocator.fill.mock.calls[0].arguments[0], 'testuser');
    });
  });

  describe('fill_input_testid', () => {
    it('fills an input located by testid', async () => {
      await fill_input_testid(mockPage, 'username-input', 'testuser');
      assert.equal(mockPage.getByTestId.mock.calls.length, 1);
      assert.equal(mockLocator.fill.mock.calls.length, 1);
      assert.equal(mockLocator.fill.mock.calls[0].arguments[0], 'testuser');
    });
  });

  describe('verify state asserts', () => {
    it('verify_element_state hidden', async () => {
      await verify_element_state(mockPage, 'button', 'Save', 'hidden');
      assert.equal(mockLocator.waitFor.mock.calls.length, 1);
      assert.deepEqual(mockLocator.waitFor.mock.calls[0].arguments[0], {
        state: 'hidden'
      });
    });

    it('verify_text_state visible', async () => {
      await verify_text_state(mockPage, 'Success', 'visible');
      assert.equal(mockLocator.waitFor.mock.calls.length, 1);
      assert.deepEqual(mockLocator.waitFor.mock.calls[0].arguments[0], {
        state: 'visible'
      });
    });

    it('verify_exact_text_state visible', async () => {
      await verify_exact_text_state(mockPage, 'Exact Success', 'visible');
      assert.equal(mockPage.getByText.mock.calls.length, 1);
      assert.deepEqual(mockPage.getByText.mock.calls[0].arguments, [
        'Exact Success',
        { exact: true }
      ]);
      assert.equal(mockLocator.waitFor.mock.calls.length, 1);
      assert.deepEqual(mockLocator.waitFor.mock.calls[0].arguments[0], {
        state: 'visible'
      });
    });

    it('verify_testid_state disabled', async () => {
      await verify_testid_state(mockPage, 'submit-btn', 'disabled');
      assert.equal(mockLocator.isDisabled.mock.calls.length, 1);
    });

    it('verify_testid_state enabled', async () => {
      await verify_testid_state(mockPage, 'submit-btn', 'enabled');
      assert.equal(mockLocator.isEnabled.mock.calls.length, 1);
    });

    it('throws error when expecting disabled but is not', async () => {
      mockLocator.isDisabled = mock.fn(async () => false);
      await assert.rejects(
        verify_testid_state(mockPage, 'submit-btn', 'disabled'),
        /Expected element to be disabled/
      );
    });

    it('throws error when expecting enabled but is not', async () => {
      mockLocator.isEnabled = mock.fn(async () => false);
      await assert.rejects(
        verify_testid_state(mockPage, 'submit-btn', 'enabled'),
        /Expected element to be enabled/
      );
    });
  });

  describe('interact_with_nth_element', () => {
    it('clicks the nth element (1-based number)', async () => {
      await interact_with_nth_element(mockPage, 'button', 'Item', 2);
      assert.equal(mockPage.getByRole.mock.calls.length, 1);
      assert.equal(mockLocator.nth.mock.calls.length, 1);
      assert.equal(mockLocator.nth.mock.calls[0].arguments[0], 1); // 2 -> 1
      assert.equal(mockLocator.click.mock.calls.length, 1);
    });

    it('parses ordinal string like "2nd" to 0-based index', async () => {
      await interact_with_nth_element(mockPage, 'button', 'Item', '2nd');
      assert.equal(mockLocator.nth.mock.calls[0].arguments[0], 1); // "2nd" -> 1
    });

    it('defaults to 0 if string does not contain a number', async () => {
      await interact_with_nth_element(mockPage, 'button', 'Item', 'first');
      assert.equal(mockLocator.nth.mock.calls[0].arguments[0], 0);
    });

    it('parses string number like "3" to 0-based index', async () => {
      await interact_with_nth_element(mockPage, 'button', 'Item', '3');
      assert.equal(mockLocator.nth.mock.calls[0].arguments[0], 2); // "3" -> 2
    });
  });

  describe('verify_element_count', () => {
    it('verifies exact element count', async () => {
      mockLocator.count = mock.fn(async () => 3);
      await verify_element_count(mockPage, 'listitem', 'Row', 3);
      assert.equal(mockLocator.count.mock.calls.length, 1); // might be called more if polling? No, immediately returns 3
    });

    it('throws if count does not match', async () => {
      mockLocator.count = mock.fn(async () => 2);
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = () => {
        callCount++;
        // First call sets start time, subsequent calls return start + 6000
        return originalDateNow() + (callCount > 1 ? 6000 : 0);
      };
      try {
        await assert.rejects(
          verify_element_count(mockPage, 'listitem', 'Row', 3),
          /Expected exactly 3 visible elements/
        );
      } finally {
        Date.now = originalDateNow;
      }
    });
  });

  describe('dismiss_if_present', () => {
    it('clicks if present', async () => {
      await dismiss_if_present(mockPage, 'button', 'Close');
      assert.equal(mockLocator.click.mock.calls.length, 1);
      assert.deepEqual(mockLocator.click.mock.calls[0].arguments[0], {
        timeout: 2000
      });
    });

    it('ignores error if not present', async () => {
      mockLocator.click = mock.fn(async () => {
        throw new Error('Element not found');
      });
      await dismiss_if_present(mockPage, 'button', 'Close');
      assert.equal(mockLocator.click.mock.calls.length, 1);
      // Should not reject
    });
  });
});
