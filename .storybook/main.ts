import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig & { viteFinal?: (config: Record<string, unknown>) => Promise<Record<string, unknown>> } = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
  typescript: {
    check: false,
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  viteFinal: async (config: Record<string, unknown>) => {
    // Mock de módulos de Next.js que no están disponibles en Storybook
    const viteConfig = config as { resolve?: { alias?: Record<string, string> } };
    viteConfig.resolve = viteConfig.resolve || {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      'next/navigation': require.resolve('./mocks/next-navigation.ts'),
      'next-auth/react': require.resolve('./mocks/next-auth-react.tsx'),
      '@/auth': require.resolve('./mocks/auth.ts'),
    };
    return config;
  },
};

export default config;