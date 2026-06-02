/**
 * Mock for @flagsmith/flagsmith/react in Storybook/Chromatic.
 * Returns all flags as enabled with null value so useFeatureFlag resolves safely.
 */
export function useFlags(flags: string[]): Record<string, { enabled: boolean; value: null }> {
  return Object.fromEntries(flags.map((f) => [f, { enabled: true, value: null }]))
}

export function useFlagsmith() {
  return { getValue: () => null, hasFeature: () => true }
}
