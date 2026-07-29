// Mock of @/lib/auth/nextauth for Storybook/Chromatic.
// NextAuth() calls resolveAuthSecret() at module init which requires AUTH_SECRET.
// This stub prevents that call from happening in the browser bundle.
export const auth = async () => null
export const handlers = {}
export const signIn = async () => {}
export const signOut = async () => {}
