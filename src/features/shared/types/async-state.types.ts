/**
 * Tipos genéricos para manejar el estado de peticiones asíncronas en componentes
 *
 * Este módulo proporciona tipos TypeScript que estandarizan el manejo de estados
 * durante peticiones asíncronas, permitiendo un control consistente del estado
 * del componente cuando hay errores, carga o éxito.
 *
 * @example
 * ```typescript
 * // Estado inicial
 * const initialState: AsyncState<User[]> = {
 *   status: 'idle',
 *   data: undefined,
 *   error: ''
 * }
 *
 * // Estado de carga
 * const loadingState: AsyncState<User[]> = {
 *   status: 'loading',
 *   data: undefined,
 *   error: ''
 * }
 *
 * // Estado exitoso
 * const successState: AsyncState<User[]> = {
 *   status: 'success',
 *   data: users,
 *   error: ''
 * }
 *
 * // Estado con error
 * const errorState: AsyncState<User[]> = {
 *   status: 'error',
 *   data: undefined,
 *   error: 'Error al obtener usuarios'
 * }
 * ```
 */

/**
 * Estado inicial de una petición asíncrona
 *
 * Representa el estado antes de que se inicie cualquier petición.
 * No hay datos ni errores en este estado.
 */
export interface AsyncIdleState {
	/** Estado: inactivo, sin petición iniciada */
	status: 'idle'
	/** Sin datos disponibles */
	data: undefined
	/** Sin mensaje de error */
	error: ''
}

/**
 * Estado de carga de una petición asíncrona
 *
 * Representa el estado mientras se está ejecutando la petición.
 * No hay datos disponibles aún, pero tampoco hay errores.
 */
export interface AsyncLoadingState {
	/** Estado: petición en progreso */
	status: 'loading'
	/** Sin datos disponibles aún */
	data: undefined
	/** Sin mensaje de error */
	error: ''
}

/**
 * Estado exitoso de una petición asíncrona
 *
 * Representa el estado cuando la petición se completó exitosamente.
 * Contiene los datos obtenidos de la petición.
 *
 * @template T - Tipo de los datos contenidos en la respuesta exitosa
 */
export interface AsyncSuccessState<T> {
	/** Estado: petición completada exitosamente */
	status: 'success'
	/** Datos obtenidos de la petición */
	data: T
	/** Sin mensaje de error */
	error: ''
}

/**
 * Estado de error de una petición asíncrona
 *
 * Representa el estado cuando la petición falló.
 * Contiene un mensaje descriptivo del error ocurrido.
 */
export interface AsyncErrorState {
	/** Estado: petición falló */
	status: 'error'
	/** Sin datos disponibles debido al error */
	data: undefined
	/** Mensaje descriptivo del error ocurrido */
	error: string
}

/**
 * Estado genérico para peticiones asíncronas
 *
 * Union type discriminado que representa todos los posibles estados
 * de una petición asíncrona. Utiliza discriminated union para permitir
 * type narrowing automático basado en el campo `status`.
 *
 * @template T - Tipo de los datos contenidos en el estado exitoso
 *
 * @example
 * ```typescript
 * // En un hook personalizado
 * function useSearchClient() {
 *   const [state, setState] = useState<AsyncState<Client[]>>({
 *     status: 'idle',
 *     data: undefined,
 *     error: ''
 *   })
 *
 *   const handleSearch = async (query: string) => {
 *     setState({ status: 'loading', data: undefined, error: '' })
 *
 *     try {
 *       const clients = await searchClients(query)
 *       setState({ status: 'success', data: clients, error: '' })
 *     } catch (error) {
 *       setState({
 *         status: 'error',
 *         data: undefined,
 *         error: error.message
 *       })
 *     }
 *   }
 *
 *   return { state, handleSearch }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Type narrowing en el componente
 * function ClientList({ state }: { state: AsyncState<Client[]> }) {
 *   if (state.status === 'loading') {
 *     return <Spinner />
 *   }
 *
 *   if (state.status === 'error') {
 *     return <ErrorMessage message={state.error} />
 *   }
 *
 *   if (state.status === 'success') {
 *     // TypeScript sabe que state.data es Client[] aquí
 *     return <ClientList items={state.data} />
 *   }
 *
 *   // state.status === 'idle'
 *   return <EmptyState />
 * }
 * ```
 */
export type AsyncState<T> =
	| AsyncIdleState
	| AsyncLoadingState
	| AsyncSuccessState<T>
	| AsyncErrorState
