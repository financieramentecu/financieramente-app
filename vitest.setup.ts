import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

type JestLike = {
  fn: typeof vi.fn;
  mock: typeof vi.mock;
  clearAllMocks: typeof vi.clearAllMocks;
  resetAllMocks: typeof vi.resetAllMocks;
  restoreAllMocks: typeof vi.restoreAllMocks;
  spyOn: typeof vi.spyOn;
  unmock: typeof vi.unmock;
  doMock: typeof vi.doMock;
  isMockFunction: typeof vi.isMockFunction;
  setSystemTime: typeof vi.setSystemTime;
  useFakeTimers: typeof vi.useFakeTimers;
  useRealTimers: typeof vi.useRealTimers;
  advanceTimersByTime: typeof vi.advanceTimersByTime;
  advanceTimersToNextTimer: typeof vi.advanceTimersToNextTimer;
  getTimerCount: typeof vi.getTimerCount;
  clearAllTimers: typeof vi.clearAllTimers;
  runAllTimers: typeof vi.runAllTimers;
  runOnlyPendingTimers: typeof vi.runOnlyPendingTimers;
};

declare global {
  // eslint-disable-next-line no-var
  var jest: JestLike;
}

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock jest functions for compatibility
globalThis.jest = {
  fn: vi.fn,
  mock: vi.mock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  spyOn: vi.spyOn,
  unmock: vi.unmock,
  doMock: vi.doMock,
  isMockFunction: vi.isMockFunction,
  setSystemTime: vi.setSystemTime,
  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  advanceTimersByTime: vi.advanceTimersByTime,
  advanceTimersToNextTimer: vi.advanceTimersToNextTimer,
  getTimerCount: vi.getTimerCount,
  clearAllTimers: vi.clearAllTimers,
  runAllTimers: vi.runAllTimers,
  runOnlyPendingTimers: vi.runOnlyPendingTimers,
} satisfies JestLike;
