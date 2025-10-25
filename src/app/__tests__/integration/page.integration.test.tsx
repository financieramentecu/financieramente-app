import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Page from '@/app/page';

describe('Home Page Integration', () => {
  it('renders and loads all components', async () => {
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
