// Mock de next-auth/react para Storybook
import React from 'react';

export const useSession = () => ({
  data: null,
  status: 'unauthenticated' as const,
  update: async () => null,
});

export const signIn = async () => {};
export const signOut = async () => {};

export const SessionProvider = ({ children }: { children: React.ReactNode }) => children;

