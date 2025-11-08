// Mock de next-auth/react para Storybook
import React, { createContext, useContext } from 'react';

// Crear contexto para la sesión
const SessionContext = createContext<{
	data: {
		user: {
			name: string;
			email: string;
			image?: string;
		};
		expires: string;
	} | null;
	status: 'authenticated' | 'unauthenticated' | 'loading';
	update: () => Promise<unknown>;
}>({
	data: null,
	status: 'unauthenticated',
	update: async () => null,
});

// Mock session data por defecto
const defaultMockSession = {
	user: {
		name: 'Juan A',
		email: 'juan.a@financieramente.com',
		image: '/avatars/juan-a.jpg',
	},
	expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export const useSession = () => {
	const context = useContext(SessionContext);
	return context || {
		data: null,
		status: 'unauthenticated' as const,
		update: async () => null,
	};
};

export const signIn = async () => {};
export const signOut = async () => {};

interface SessionProviderProps {
	children: React.ReactNode;
	session?: {
		user: {
			name: string;
			email: string;
			image?: string;
		};
		expires: string;
	} | null;
}

export const SessionProvider = ({ children, session }: SessionProviderProps) => {
	const sessionData = session || defaultMockSession;
	const value = {
		data: sessionData,
		status: sessionData ? ('authenticated' as const) : ('unauthenticated' as const),
		update: async () => null,
	};

	return (
		<SessionContext.Provider value={value}>
			{children}
		</SessionContext.Provider>
	);
};

