import bcrypt from 'bcryptjs'

/**
 * Número de rondas de salt para bcrypt
 * 10 rondas es el estándar recomendado para balance entre seguridad y performance
 */
const SALT_ROUNDS = 10

/**
 * Hashea una contraseña usando bcrypt
 * @param password - Contraseña en texto plano
 * @returns Promise con el hash de la contraseña
 */
export async function hashPassword(password: string): Promise<string> {
    if (!password || password.trim().length === 0) {
        throw new Error('Password cannot be empty')
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    return hash
}

/**
 * Verifica una contraseña contra su hash
 * @param password - Contraseña en texto plano a verificar
 * @param hash - Hash almacenado en la base de datos
 * @returns Promise<boolean> - true si la contraseña coincide, false si no
 */
export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    if (!password || !hash) {
        return false
    }

    try {
        const isValid = await bcrypt.compare(password, hash)
        return isValid
    } catch (error) {
        console.error('Error verifying password:', error)
        return false
    }
}

/**
 * Genera una contraseña temporal aleatoria
 * @param length - Longitud de la contraseña (default: 12)
 * @returns Contraseña temporal
 */
export function generateTemporaryPassword(length: number = 12): string {
    const charset =
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''

    // Asegurar al menos un carácter de cada tipo
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const special = '!@#$%^&*'

    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    // Completar el resto de la longitud
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)]
    }

    // Mezclar los caracteres
    return password
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('')
}

/**
 * Valida que una contraseña cumpla con los requisitos mínimos
 * @param password - Contraseña a validar
 * @returns Objeto con resultado de validación y mensaje de error si aplica
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean
    error?: string
} {
    if (!password || password.length < 8) {
        return {
            isValid: false,
            error: 'La contraseña debe tener al menos 8 caracteres',
        }
    }

    if (!/[a-z]/.test(password)) {
        return {
            isValid: false,
            error: 'La contraseña debe contener al menos una letra minúscula',
        }
    }

    if (!/[A-Z]/.test(password)) {
        return {
            isValid: false,
            error: 'La contraseña debe contener al menos una letra mayúscula',
        }
    }

    if (!/[0-9]/.test(password)) {
        return {
            isValid: false,
            error: 'La contraseña debe contener al menos un número',
        }
    }

    return { isValid: true }
}
