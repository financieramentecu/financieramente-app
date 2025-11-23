# ⚠️ Configuración de Variables de Entorno Requerida

## Error Actual

Estás viendo errores 500 porque faltan las variables de entorno necesarias para NextAuth.

## Solución Rápida

### 1. Crear archivo `.env.local`

En la raíz del proyecto, crea un archivo llamado `.env.local`:

```bash
touch .env.local
```

### 2. Agregar las variables necesarias

Copia y pega esto en `.env.local`:

```env
# NextAuth Configuration (REQUERIDO)
# Genera un secreto seguro con: openssl rand -base64 32
# NextAuth v5 usa AUTH_SECRET, pero también acepta NEXTAUTH_SECRET
AUTH_SECRET=tu_secreto_aqui_genera_uno_seguro
# O alternativamente:
# NEXTAUTH_SECRET=tu_secreto_aqui_genera_uno_seguro
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Credentials (Opcional - solo si quieres usar Google OAuth)
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### 3. Generar NEXTAUTH_SECRET

Ejecuta este comando para generar un secreto seguro:

```bash
openssl rand -base64 32
```

Copia el resultado y pégalo como valor de `NEXTAUTH_SECRET` en `.env.local`.

### 4. Reiniciar el servidor

```bash
# Detén el servidor (Ctrl+C)
# Luego reinicia:
npm run dev
```

## Opciones de Configuración

### Opción A: Solo Variables Mínimas (Para pruebas rápidas)

```env
NEXTAUTH_SECRET=tu_secreto_generado
NEXTAUTH_URL=http://localhost:3000
```

### Opción B: Con Google OAuth

```env
NEXTAUTH_SECRET=tu_secreto_generado
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### Opción C: Modo Desarrollo (Sin Google OAuth)

```env
NEXTAUTH_SECRET=tu_secreto_generado
NEXTAUTH_URL=http://localhost:3000

# Activar modo desarrollo
USE_DEV_AUTH=true
NEXT_PUBLIC_USE_DEV_AUTH=true
```

## Verificar que Funciona

Después de configurar las variables y reiniciar el servidor:

1. Ve a `http://localhost:3000/login`
2. No deberías ver errores 500 en la consola
3. El endpoint `/api/auth/session` debería responder correctamente

## Troubleshooting

### Error: "NEXTAUTH_SECRET is missing"

- **Solución**: Asegúrate de tener `NEXTAUTH_SECRET` en `.env.local`
- Verifica que el archivo se llame exactamente `.env.local` (no `.env`)

### Error: "500 Internal Server Error"

- **Solución**:
  1. Verifica que todas las variables estén en `.env.local`
  2. Reinicia el servidor completamente
  3. Limpia la caché: `rm -rf .next`

### Error: "Invalid credentials" (Google OAuth)

- **Solución**: Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén correctos

## Notas Importantes

- **NUNCA commitees `.env.local`** al repositorio (está en `.gitignore`)
- El `NEXTAUTH_SECRET` debe ser único y seguro
- En producción, usa variables de entorno del servidor, no archivos `.env.local`
