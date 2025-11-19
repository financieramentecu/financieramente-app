// Mock de next/navigation para Storybook
export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  prefetch: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
});

export const usePathname = () => '/';

export const useSearchParams = () => new URLSearchParams();

export const redirect = () => {};

export const notFound = () => {};




