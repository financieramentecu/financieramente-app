# 🚀 Activar Login Mock - Guía Rápida

## ⚡ Configuración en 3 Pasos

### Paso 1: Crear archivo `.env.local`

```bash
# En la raíz del proyecto
touch .env.local
```

### Paso 2: Agregar configuración

Abre `.env.local` y agrega:

```env
# Generar secreto con: openssl rand -base64 32
AUTH_SECRET=tu_secreto_generado_aqui
NEXTAUTH_URL=http://localhost:3000

# ACTIVAR MODO MOCK (esto es lo importante)
USE_DEV_AUTH=true
NEXT_PUBLIC_USE_DEV_AUTH=true
```

### Paso 3: Reiniciar servidor

```bash
npm run dev
```

## ✅ ¡Listo! Ahora puedes usar el login mock

### Opción 1: Desde el botón "Continuar con Google"

1. Ve a `http://localhost:3000/login`
2. Haz clic en **"Continuar con Google (Mock)"**
3. Serás autenticado automáticamente con un usuario mock
4. Redirige a `/dashboard`

### Opción 2: Desde el campo de email

1. Ve a `http://localhost:3000/login`
2. Ingresa cualquier email que termine en `@financieramentecu.com`
   - Ejemplo: `test@financieramentecu.com`
3. Haz clic en **"Login Mock"**
4. Serás autenticado y redirigido al dashboard

### Opción 3: Página dedicada de desarrollo

1. Ve a `http://localhost:3000/login/dev`
2. Completa el formulario y haz clic en "Iniciar Sesión (Dev)"

## 🎯 Ventajas del Modo Mock

- ✅ **No requiere Google OAuth** - Funciona sin configurar Google Cloud Console
- ✅ **Rápido** - Login instantáneo sin redirecciones externas
- ✅ **Mismo comportamiento** - Rutas protegidas, sesiones, todo funciona igual
- ✅ **Fácil de probar** - Puedes testear diferentes escenarios rápidamente

## 🔄 Cambiar entre Mock y Google OAuth

### Para desactivar el mock y usar Google OAuth:

```env
# Comentar o eliminar estas líneas en .env.local:
# USE_DEV_AUTH=true
# NEXT_PUBLIC_USE_DEV_AUTH=true
```

Luego reinicia el servidor.

## 📝 Notas

- El modo mock **solo funciona en desarrollo** (`NODE_ENV=development`)
- Se desactiva automáticamente en producción
- La validación de dominio corporativo se mantiene (solo emails `@financieramentecu.com`)

## 🐛 Troubleshooting

**El modo mock no funciona:**
1. Verifica que `.env.local` tenga `USE_DEV_AUTH=true`
2. Verifica que `NEXT_PUBLIC_USE_DEV_AUTH=true` esté configurado
3. Reinicia el servidor completamente
4. Verifica que no estés en modo producción

**El botón de Google sigue intentando usar Google OAuth:**
- Verifica que las variables de entorno estén correctamente configuradas
- Reinicia el servidor
- Limpia la caché del navegador

