import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import Page from '@/app/page';

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
    (auth as unknown as ReturnType<typeof vi.fn<() => Promise<{ user: { email: string; name: string }; expires: string } | null>>>).mockResolvedValueOnce(null);

    await Page();

    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to dashboard when authenticated', async () => {
    const { auth } = await import('@/auth');
    (auth as unknown as ReturnType<typeof vi.fn<() => Promise<{ user: { email: string; name: string }; expires: string } | null>>>).mockResolvedValueOnce({
      user: {
        email: 'test@financieramentecu.com',
        name: 'Test User',
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await Page();

    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});
