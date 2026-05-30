import { test, describe } from 'node:test';
import assert from 'node:assert';
import { logger, LogLevel } from './logger.js';

describe('Logger', () => {
  test('respects log levels', () => {
    let errorCalled = 0;
    let warnCalled = 0;
    let infoCalled = 0;
    let debugCalled = 0;

    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    console.error = () => {
      errorCalled++;
    };
    console.warn = () => {
      warnCalled++;
    };
    console.log = (msg) => {
      if (msg.includes('info')) infoCalled++;
      if (msg.includes('debug')) debugCalled++;
    };

    logger.setLevel(LogLevel.ERROR);
    logger.error('error');
    logger.warn('warn');
    logger.info('info');
    logger.debug('debug');
    assert.strictEqual(errorCalled, 1);
    assert.strictEqual(warnCalled, 0);
    assert.strictEqual(infoCalled, 0);
    assert.strictEqual(debugCalled, 0);

    logger.setLevel(LogLevel.WARN);
    logger.error('error');
    logger.warn('warn');
    logger.info('info');
    logger.debug('debug');
    assert.strictEqual(errorCalled, 2);
    assert.strictEqual(warnCalled, 1);
    assert.strictEqual(infoCalled, 0);
    assert.strictEqual(debugCalled, 0);

    logger.setLevel(LogLevel.INFO);
    logger.error('error');
    logger.warn('warn');
    logger.info('info');
    logger.debug('debug');
    assert.strictEqual(errorCalled, 3);
    assert.strictEqual(warnCalled, 2);
    assert.strictEqual(infoCalled, 1);
    assert.strictEqual(debugCalled, 0);

    logger.setLevel(LogLevel.DEBUG);
    logger.error('error');
    logger.warn('warn');
    logger.info('info');
    logger.debug('debug');
    assert.strictEqual(errorCalled, 4);
    assert.strictEqual(warnCalled, 3);
    assert.strictEqual(infoCalled, 2);
    assert.strictEqual(debugCalled, 1);

    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
  });
});
