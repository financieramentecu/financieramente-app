# 🔧 Configuración de Google OAuth - Solución Error redirect_uri_mismatch

## ❌ Error: `Error 400: redirect_uri_mismatch`

Este error ocurre cuando la URL de redirección que envía tu aplicación no coincide con las URIs autorizadas en Google Cloud Console.

## ✅ Solución Paso a Paso

### Paso 1: Ir a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo si no tienes)
3. En el menú lateral, ve a **APIs & Services** > **Credentials**

### Paso 2: Encontrar tu OAuth Client ID

1. Busca el OAuth 2.0 Client ID que coincide con:
   - **Client ID**: `your_google_client_id_here.apps.googleusercontent.com`
2. Haz clic en el nombre del cliente para editarlo

### Paso 3: Agregar URIs de Redirección Autorizadas

En la sección **"Authorized redirect URIs"**, agrega estas URLs exactas:

#### Para Desarrollo Local:

```
http://localhost:3000/api/auth/callback/google
```

#### Para QA (si aplica):

```
https://negocios.qa.financieramentecu.co/api/auth/callback/google
```

#### Para Producción:

```
https://negocios.financieramentecu.co/api/auth/callback/google
```

### Paso 4: Guardar Cambios

1. Haz clic en **"SAVE"** (Guardar) en la parte inferior
2. Espera unos segundos para que los cambios se propaguen

### Paso 5: Verificar Configuración

La sección debería verse así:

**Authorized redirect URIs:**

- `http://localhost:3000/api/auth/callback/google`
- `https://negocios.qa.financieramentecu.co/api/auth/callback/google`
- `https://negocios.financieramentecu.co/api/auth/callback/google`

**Authorized JavaScript origins:**

- `http://localhost:3000`
- `https://negocios.qa.financieramentecu.co`
- `https://negocios.financieramentecu.co`

## ⚠️ Puntos Importantes

### 1. Exactitud es Crucial

- Las URLs deben coincidir **exactamente** (incluyendo `http://` vs `https://`)
- No incluyas una barra final (`/`) al final
- Respeta mayúsculas/minúsculas

### 2. Formato Correcto

✅ **Correcto:**

```
http://localhost:3000/api/auth/callback/google
```

❌ **Incorrecto:**

```
http://localhost:3000/api/auth/callback/google/
http://localhost:3000/api/auth/callback/Google
http://localhost:3000/api/auth/callback/google?param=value
```

### 3. JavaScript Origins

También asegúrate de agregar los **JavaScript origins** correspondientes:

**Authorized JavaScript origins:**

- `http://localhost:3000`
- `https://negocios.qa.financieramentecu.co`
- `https://negocios.financieramentecu.co`

## 🔄 Después de Configurar

1. **Espera 1-2 minutos** para que los cambios se propaguen
2. **Limpia la caché del navegador** o prueba en modo incógnito
3. **Reintenta el login** con Google

## 🧪 Verificar que Funciona

1. Ve a `http://localhost:3000/login`
2. Haz clic en "Continuar con Google"
3. Deberías ser redirigido a Google para autenticarte
4. Después de autorizar, deberías volver a tu aplicación

## 📋 Checklist de Verificación

- [ ] OAuth Client ID correcto seleccionado en Google Cloud Console
- [ ] URI de redirección agregada: `http://localhost:3000/api/auth/callback/google`
- [ ] JavaScript origin agregado: `http://localhost:3000`
- [ ] Cambios guardados en Google Cloud Console
- [ ] Esperado 1-2 minutos para propagación
- [ ] Probado el login nuevamente

## 🐛 Troubleshooting

### Error persiste después de configurar

1. **Verifica que guardaste los cambios** en Google Cloud Console
2. **Espera más tiempo** (hasta 5 minutos) para que se propaguen
3. **Verifica la URL exacta** que se está enviando:
   - Abre las herramientas de desarrollador (F12)
   - Ve a la pestaña Network
   - Intenta hacer login
   - Busca la solicitud a `accounts.google.com`
   - Verifica el parámetro `redirect_uri` en la URL

### Error: "The redirect URI in the request does not match"

- Verifica que la URL en Google Cloud Console coincida exactamente
- No uses `https://` en localhost (debe ser `http://`)
- Asegúrate de que no haya espacios o caracteres extra

### Error: "Invalid client"

- Verifica que el `GOOGLE_CLIENT_ID` en `.env.local` sea correcto
- Verifica que estás usando el cliente correcto en Google Cloud Console

## 📚 Recursos Adicionales

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
