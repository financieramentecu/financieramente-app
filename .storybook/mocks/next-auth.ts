// Mock of the 'next-auth' package for Storybook/Chromatic.
// NextAuth() calls resolveAuthSecret() synchronously at module init,
// which requires AUTH_SECRET. This stub prevents that call entirely.
const NextAuth = () => ({
  auth: async () => null,
  handlers: {},
  signIn: async () => {},
  signOut: async () => {},
})

export default NextAuth
export const auth = async () => null
export const handlers = {}
export const signIn = async () => {}
export const signOut = async () => {}
