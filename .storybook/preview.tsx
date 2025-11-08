import type { Preview } from "@storybook/react";
import React from "react";
import { ThemeProvider } from "../src/hooks/use-theme";
import { Toaster } from "../src/components/ui/sonner";
import { SessionProvider } from "next-auth/react";

// Importar Tailwind CSS
import "../src/app/tailwind.css";
// Importar variables CSS personalizadas
import "../src/app/globals.css";

// Mock session data para Storybook
const mockSession = {
	user: {
		name: 'Juan A',
		email: 'juan.a@financieramente.com',
		image: '/avatars/juan-a.jpg',
	},
	expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0a0a0a',
        },
        {
          name: 'financieramente-primary',
          value: '#00505C',
        },
        {
          name: 'financieramente-secondary',
          value: '#83D874',
        },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px',
          },
        },
        large: {
          name: 'Large Desktop',
          styles: {
            width: '1440px',
            height: '900px',
          },
        },
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
          {
            id: 'keyboard-navigation',
            enabled: true,
          },
          {
            id: 'focus-management',
            enabled: true,
          },
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <SessionProvider session={mockSession}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="sidebar-storybook">
            <Story />
            <Toaster />
          </div>
        </ThemeProvider>
      </SessionProvider>
    ),
  ],
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;