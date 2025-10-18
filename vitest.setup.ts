import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock jest functions for compatibility
global.jest = {
  fn: vi.fn,
  mock: vi.mock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  spyOn: vi.spyOn,
  unmock: vi.unmock,
  doMock: vi.doMock,
  dontMock: vi.dontMock,
  hoisted: vi.hoisted,
  isMockFunction: vi.isMockFunction,
  setSystemTime: vi.setSystemTime,
  getSystemTime: vi.getSystemTime,
  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  advanceTimersByTime: vi.advanceTimersByTime,
  advanceTimersToNextTimer: vi.advanceTimersToNextTimer,
  getTimerCount: vi.getTimerCount,
  clearAllTimers: vi.clearAllTimers,
  runAllTimers: vi.runAllTimers,
  runOnlyPendingTimers: vi.runOnlyPendingTimers,
} as any
