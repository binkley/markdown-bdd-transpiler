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
  verify_testid_state
} from '../../framework/standard-ui-steps.js';

describe('Standard UI Steps', () => {
  let mockLocator: any;
  let mockPage: any;

  beforeEach(() => {
    mockLocator = {
      locator: mock.fn(() => mockLocator),
      first: mock.fn(() => mockLocator),
      click: mock.fn(async () => {}),
      fill: mock.fn(async () => {}),
      waitFor: mock.fn(async () => {}),
      isDisabled: mock.fn(async () => true),
      isEnabled: mock.fn(async () => true)
    };

    mockPage = {
      goto: mock.fn(async () => {}),
      getByRole: mock.fn(() => mockLocator),
      getByText: mock.fn(() => mockLocator),
      getByTestId: mock.fn(() => mockLocator)
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
});
