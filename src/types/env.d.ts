/**
 * Definiciones de tipos para variables de entorno
 * Asegura que TypeScript reconozca todos los valores posibles de NODE_ENV
 */
declare namespace NodeJS {
	interface ProcessEnv {
		/**
		 * Ambiente de Node.js
		 * Puede ser 'development', 'test', 'production', o 'qa'
		 */
		NODE_ENV: 'development' | 'test' | 'production' | 'qa'
		
		/**
		 * URL pública de la API
		 */
		NEXT_PUBLIC_API_URL?: string
		
		/**
		 * Secret para NextAuth
		 */
		NEXTAUTH_SECRET?: string
		
		/**
		 * URL base de la aplicación
		 */
		NEXTAUTH_URL?: string
		
		/**
		 * Cliente OAuth de Google
		 */
		GOOGLE_CLIENT_ID?: string
		
		/**
		 * Secret del cliente OAuth de Google
		 */
		GOOGLE_CLIENT_SECRET?: string
		
		/**
		 * URL de conexión a la base de datos
		 */
		DATABASE_URL?: string
		
		/**
		 * Deshabilitar telemetría de Next.js
		 */
		NEXT_TELEMETRY_DISABLED?: string
	}
}

