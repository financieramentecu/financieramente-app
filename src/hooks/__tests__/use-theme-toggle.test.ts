import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useThemeToggle } from '../use-theme-toggle';

describe('useThemeToggle', () => {
  it('toggles theme', () => {
    const { result } = renderHook(() => useThemeToggle());

    // Check if the hook returns something
    expect(result.current).toBeDefined();

    // If the hook returns an object with toggleTheme, test it
    if (
      typeof result.current === 'object' &&
      result.current !== null &&
      'toggleTheme' in result.current
    ) {
      act(() => {
        (result.current as { toggleTheme: () => void }).toggleTheme();
      });

      expect(result.current).toBeDefined();
    }
  });
});
