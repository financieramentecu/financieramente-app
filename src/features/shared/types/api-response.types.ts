/**
 * Tipos genéricos para estandarizar las respuestas de las APIs
 *
 * Este módulo proporciona tipos TypeScript que garantizan consistencia
 * en la estructura de respuestas de todas las APIs del proyecto.
 *
 * @example
 * ```typescript
 * // Respuesta exitosa
 * const successResponse: ApiResponse<User[]> = {
 *   data: users
 * }
 *
 * // Respuesta con error
 * const errorResponse: ApiResponse<null> = {
 *   data: null,
 *   error: 'Error al obtener usuarios'
 * }
 * ```
 */

/**
 * Respuesta exitosa de la API
 *
 * Contiene los datos solicitados sin ningún error.
 *
 * @template T - Tipo de los datos contenidos en la respuesta
 *
 * @example
 * ```typescript
 * const response: ApiSuccessResponse<User> = {
 *   data: { id: '1', name: 'John' }
 * }
 * ```
 */
export interface ApiSuccessResponse<T> {
	/** Datos de la respuesta */
	data: T
}

/**
 * Respuesta con error de la API
 *
 * Indica que ocurrió un error durante el procesamiento de la solicitud.
 * El campo `data` siempre será `null` cuando hay un error.
 *
 * @example
 * ```typescript
 * const response: ApiErrorResponse = {
 *   data: null,
 *   error: 'Error al procesar la solicitud'
 * }
 * ```
 */
export interface ApiErrorResponse {
	/** Siempre será `null` cuando hay un error */
	data: null
	/** Mensaje descriptivo del error ocurrido */
	error: string
}

/**
 * Respuesta genérica de la API
 *
 * Union type que representa tanto respuestas exitosas como respuestas con error.
 * Utiliza discriminated union para permitir type narrowing basado en la presencia
 * del campo `error`.
 *
 * @template T - Tipo de los datos contenidos en la respuesta exitosa
 *
 * @example
 * ```typescript
 * // En un route handler de Next.js
 * export async function GET() {
 *   try {
 *     const users = await getUsers()
 *     return NextResponse.json(
 *       { data: users } satisfies ApiResponse<User[]>
 *     )
 *   } catch (error) {
 *     return NextResponse.json(
 *       { data: null, error: 'Error al obtener usuarios' } satisfies ApiResponse<null>,
 *       { status: 500 }
 *     )
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Type narrowing en el cliente
 * function handleResponse<T>(response: ApiResponse<T>) {
 *   if ('error' in response) {
 *     // TypeScript sabe que response es ApiErrorResponse aquí
 *     console.error(response.error)
 *   } else {
 *     // TypeScript sabe que response es ApiSuccessResponse<T> aquí
 *     console.log(response.data)
 *   }
 * }
 * ```
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
