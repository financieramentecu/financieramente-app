/**
 * Configuración y constantes para el módulo de gestión de usuarios
 */

// Configuración de debounce
export const DEBOUNCE_DELAY = 500 // ms

// Mensajes de éxito
export const SUCCESS_MESSAGES = {
    USER_UPDATED: 'Usuario actualizado exitosamente',
    USER_ACTIVATED: 'Usuario activado exitosamente',
    USER_DEACTIVATED: 'Usuario desactivado exitosamente',
    ROLE_UPDATED: 'Rol actualizado exitosamente',
} as const

// Mensajes de error
export const ERROR_MESSAGES = {
    USER_UPDATE_FAILED: 'Error al actualizar el usuario',
    USER_LOAD_FAILED: 'Error al cargar el usuario',
    USERS_LOAD_FAILED: 'Error al cargar los usuarios',
    ROLES_LOAD_FAILED: 'Error al cargar los roles',
    UNKNOWN_ERROR: 'Error desconocido',
} as const

// Mensajes de advertencia
export const WARNING_MESSAGES = {
    USER_INACTIVE: 'El usuario está inactivo y no puede iniciar sesión',
    USER_NO_ROLE: 'El usuario no tiene un rol asignado',
    USER_DEFAULT_ROLE:
        'El usuario tiene el rol DEFAULT que no permite acceso al sistema',
    DEFAULT_ROLE_SELECTED:
        'El rol DEFAULT no permite acceso al sistema. Asigna un rol diferente para que el usuario pueda iniciar sesión.',
} as const

// Textos de UI
export const UI_TEXT = {
    LOADING_USERS: 'Cargando usuarios...',
    NO_USERS_FOUND: 'No se encontraron usuarios',
    SEARCH_PLACEHOLDER: 'Buscar por nombre o email...',
    ALL_STATUSES: 'Todos los estados',
    ACTIVE: 'Activos',
    INACTIVE: 'Inactivos',
    ALL_ROLES: 'Todos los roles',
    CLEAR_FILTERS: 'Limpiar filtros',
    FILTERS_ACTIVE: 'Activos',
    VIEW_DETAIL: 'Ver detalle',
    BACK_TO_USERS: 'Volver a Usuarios',
    SAVE_CHANGES: 'Guardar Cambios',
    SAVING: 'Guardando...',
    CANCEL: 'Cancelar',
    DEACTIVATE_USER: 'Desactivar Usuario',
    MORE_FILTERS: 'Filtros',
    FILTERS_TITLE: 'Filtros de Búsqueda',
} as const

// Títulos de diálogo
export const DIALOG_TITLES = {
    DEACTIVATE_USER: '¿Desactivar usuario?',
} as const

// Descripciones de diálogo
export const DIALOG_DESCRIPTIONS = {
    DEACTIVATE_USER: (userName: string) =>
        `¿Estás seguro de que deseas desactivar a ${userName}? El usuario no podrá iniciar sesión hasta que sea activado nuevamente por un administrador.`,
} as const
