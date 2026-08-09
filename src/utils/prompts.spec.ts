import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { multiselect } from './prompts.js';
import { EarlyExitError } from './errors.js';

describe('Prompts multiselect', { skip: !!process.env.CI }, () => {
  let inStream: PassThrough & {
    isTTY?: boolean;
    setRawMode?: (mode: boolean) => void;
  };
  let outStream: PassThrough;

  beforeEach(() => {
    inStream = new PassThrough() as any;
    inStream.isTTY = true;
    inStream.setRawMode = () => {}; // mock

    outStream = new PassThrough();
  });

  const emitKey = (name: string, ctrl = false) => {
    inStream.emit('keypress', '', { name, ctrl });
  };

  test('resolves with selected items', async () => {
    const promise = multiselect(
      'Choose?',
      [
        { label: 'A', value: 'a' },
        { label: 'B', value: 'b' },
        { label: 'C', value: 'c' }
      ],
      inStream as any,
      outStream as any
    );

    // Wait a tick for initial render
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Press down (moves to B)
    emitKey('down');
    // Press space (selects B)
    emitKey('space');
    // Press down (moves to C)
    emitKey('down');
    // Press down (wraps to A)
    emitKey('down');
    // Press up (wraps to C)
    emitKey('up');
    // Press space (selects C)
    emitKey('space');
    // Press enter
    emitKey('return');

    const result = await promise;
    assert.deepEqual(result, ['b', 'c']);
  });

  test('aborts on Ctrl+C', async () => {
    const promise = multiselect(
      'Choose?',
      [{ label: 'A', value: 'a' }],
      inStream as any,
      outStream as any
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    emitKey('c', true); // Ctrl+C

    await assert.rejects(promise, EarlyExitError);
  });

  test('aborts on Escape', async () => {
    const promise = multiselect(
      'Choose?',
      [{ label: 'A', value: 'a' }],
      inStream as any,
      outStream as any
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    emitKey('escape'); // Esc

    await assert.rejects(promise, EarlyExitError);
  });
});
