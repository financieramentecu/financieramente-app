import { render } from '@testing-library/react';
import Page from './page';

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Page />);
    // Basic test to ensure the page renders
    expect(document.body).toBeInTheDocument();
  });
});
