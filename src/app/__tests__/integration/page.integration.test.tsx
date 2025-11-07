import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import Page from '@/app/page';
import type { Session } from 'next-auth';

// Mock de next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock de @/auth
vi.mock('@/auth', () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

describe('Home Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login when not authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce(null);

    await Page();

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to dashboard when authenticated', async () => {
    const { auth } = await import('@/auth');
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        email: 'test@financieramentecu.com',
        name: 'Test User',
      },
    } as Session);

    await Page();

    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});
