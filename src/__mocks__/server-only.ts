// Mock for `server-only` package used in Vitest test environments.
// The real package throws an error if imported from the client side (runtime check by Next.js).
// In tests we just need a no-op so the import resolves without error.
export {}
