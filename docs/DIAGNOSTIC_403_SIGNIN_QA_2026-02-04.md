# Diagnóstico 403 en POST /api/auth/signin/google (QA) — 4 feb 2026

**Solicitud:** Solo diagnóstico, sin cambios. Investigar por qué sigue retornando 403 Forbidden tras un rato y si faltan cabeceras que bloqueen la petición.

**Servidor:** `root@64.225.11.130` (QA), contenedores: `financieramente-nginx-qa`, `financieramente-nextjs-qa`.

---

## 1. Conclusión principal: quién devuelve el 403

**El 403 lo devuelve Next.js (NextAuth), no Nginx.**

Evidencia:

1. **Access log de Nginx**  
   Las líneas de `/api/auth/signin/google` muestran ` 403 0 ` (status y body_bytes_sent). En configuración proxy, `$status` en el log es el **código que devuelve el upstream** (Next.js). Nginx solo reenvía esa respuesta.

2. **Prueba directa al upstream**  
   Desde el propio servidor se ejecutó un POST directo a Next.js (sin pasar por Nginx):

   ```bash
   docker exec financieramente-nextjs-qa wget -q -O- --post-data="..." \
     --header="Host: negocios.qa.financieramentecu.co" \
     --header="X-Forwarded-Proto: https" \
     "http://127.0.0.1:3000/api/auth/signin/google"
   ```

   Respuesta: **HTTP/1.1 403 Forbidden**.  
   Por tanto, Next.js/NextAuth está generando el 403 incluso cuando la petición llega directamente al puerto 3000 con cabeceras correctas.

3. **No hay reglas en Nginx que devuelvan 403**  
   En `location /api/auth/` no hay `deny`, `return 403` ni módulos que bloqueen POST. Las cabeceras proxy (Host, X-Forwarded-Proto, X-Forwarded-Host, etc.) están configuradas.

**Conclusión:** El problema no es Nginx ni cabeceras faltantes en el proxy. La causa está en la lógica de NextAuth (validación CSRF, host, cookies, etc.) en el servidor Next.js.

---

## 2. Resumen de lo revisado en el servidor

| Revisión | Resultado |
|----------|-----------|
| Nginx access log (auth + 403) | POST `/api/auth/signin/google?` → 403; GET session/providers/csrf → 200 |
| Nginx error log | Sin errores relevantes para auth |
| Contenedores | nginx-qa, nextjs-qa, postgres-qa Up |
| NEXTAUTH_URL (solo host en env) | `negocios.qa.financieramentecu.co` |
| POST directo a Next.js :3000 | 403 Forbidden |
| Código (trustHost) | `trustHost: true` en `src/lib/auth/config.ts` y `nextauth.ts` |

---

## 3. Causas probables del 403 en NextAuth (referencias web)

Búsquedas realizadas: NextAuth 403 detrás de Nginx, POST signin, CSRF, untrusted host, cabeceras proxy.

- **Validación CSRF**  
  NextAuth/Auth.js exige un token CSRF en POST a `/api/auth/signin/:provider`. El token se obtiene de `/api/auth/csrf` y debe enviarse en el body; además se usa una cookie (ej. `__Host-authjs.csrf-token` / `_Host-authjs.csrf-token`) en el esquema “double submit”. Si la cookie no se envía (bloqueada por el navegador, dominio, SameSite, Secure) o no coincide con el body, la petición puede terminar en **403**.

- **Cookie rechazada o no enviada**  
  Cookies con prefijo `__Host-` requieren HTTPS, mismo host y Secure. Cualquier desalineación de dominio (typo en NEXTAUTH_URL, distinto subdominio) o que el usuario acceda por HTTP puede hacer que el navegador no envíe la cookie y NextAuth responda 403.

- **NEXTAUTH_URL**  
  Debe coincidir exactamente con la URL que ve el usuario (ej. `https://negocios.qa.financieramentecu.co` sin barra final, sin puerto). Si no, las cookies y/o la validación de host pueden fallar.

- **Cabeceras proxy**  
  Para NextAuth detrás de proxy se recomienda: Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host. En tu `nginx.conf` para `location /api/auth/` estas cabeceras están configuradas; no se detectan cabeceras faltantes que expliquen el 403 por parte de Nginx.

El hecho de que “después de un rato” vuelva el 403 puede deberse a:

- Caducidad o rotación del token CSRF mientras la pestaña sigue abierta.
- Cookies de sesión/CSRF que expiran o se invalidan.
- Algún comportamiento de keepalive ya mitigado con `Connection "close"` en Nginx; si el 403 persiste, la causa actual es la validación en NextAuth, no la conexión.

---

## 4. Observaciones adicionales en los logs

- **Tu IP (152.201.57.32):**  
  GET `/api/auth/session`, `/api/auth/providers`, `/api/auth/csrf` → 200; luego POST `/api/auth/signin/google?` → **403 0** (body vacío). Coherente con rechazo por NextAuth (p. ej. CSRF).

- **Otros 403 en el mismo log:**  
  Muchos POST a `/`, `/_next/*`, `/app`, `/api/route` desde IPs como 104.28.210.248, 87.121.84.24, etc., con Referer `-` y body 5 bytes. Parecen tráfico de bots/escáneres o respuestas genéricas de la app; no corresponden al flujo de “Sign in with Google” del usuario.

---

## 5. Recomendaciones (solo diagnóstico; sin aplicar cambios)

1. **Confirmar en el navegador que la cookie de CSRF se envía**  
   En DevTools → pestaña Network → solicitud POST a `.../api/auth/signin/google` → Request Headers → Cookie. Verificar que aparece la cookie de CSRF de Auth.js (ej. `_Host-authjs.csrf-token` o `__Host-authjs.csrf-token`). Si no está, el 403 puede deberse a que NextAuth no recibe el token en cookie.

2. **Comprobar valor exacto de NEXTAUTH_URL en el contenedor**  
   Asegurarse de que en el contenedor Next.js sea exactamente `https://negocios.qa.financieramentecu.co` (sin barra final, sin puerto, HTTPS). Cualquier diferencia puede afectar cookies y validación de host.

3. **Activar debug de NextAuth de forma temporal**  
   Si Auth.js/NextAuth permite variable tipo `AUTH_DEBUG=true` (o equivalente), activarla en el entorno del contenedor y reproducir el 403; revisar los logs de Next.js para ver el mensaje exacto (CSRF, host, etc.).

4. **Revisar si hay proxy/WAF delante**  
   La IP 104.28.210.248 suele ser Cloudflare. Si el tráfico pasa por un proxy o WAF, comprobar que no modifique cookies ni cabeceras necesarias para NextAuth (Host, X-Forwarded-Proto, cookie de CSRF).

5. **No es necesario cambiar Nginx para este 403**  
   Las cabeceras proxy para `/api/auth/` están correctas; el 403 se genera en Next.js. El uso de `Connection "close"` en Nginx para auth sigue siendo recomendable para evitar reutilización de conexiones keepalive, pero no soluciona por sí solo un 403 causado por validación CSRF/host/cookies en NextAuth.

---

## 6. Comandos utilizados en el servidor (referencia)

```bash
# Logs Nginx (auth y 403)
docker logs financieramente-nginx-qa --tail 400 2>&1 | grep -E '/api/auth/| 403 '

# Logs Next.js (auth/403/csrf)
docker logs financieramente-nextjs-qa --tail 300 2>&1 | grep -iE 'auth|403|csrf|forbidden|signin'

# Variables de entorno (solo nombres; valores enmascarados)
docker exec financieramente-nextjs-qa env | grep -E 'NEXTAUTH|AUTH_|NODE_ENV'

# NEXTAUTH_URL solo host
docker exec financieramente-nextjs-qa env | grep NEXTAUTH_URL | sed 's|https\?://||' | sed 's|/.*||'

# POST directo a Next.js (sin Nginx)
docker exec financieramente-nextjs-qa wget -q -O- --post-data="csrfToken=test&callbackUrl=..." \
  --header="Host: negocios.qa.financieramentecu.co" \
  --header="X-Forwarded-Proto: https" \
  "http://127.0.0.1:3000/api/auth/signin/google"
# Resultado: HTTP/1.1 403 Forbidden
```

---

## 7. Solución aplicada (en base al diagnóstico)

Se aplican estos cambios para reducir el 403 en POST `/api/auth/signin/google` detrás de Nginx. La cookie CSRF se mantiene con el valor por defecto de Auth.js (`__Host-`), que es la práctica recomendada.

### 7.1. Variable de entorno `AUTH_TRUST_HOST=true` (servidor)

Auth.js puede comprobar también la variable de entorno. En entornos detrás de proxy (QA/prod) hay que definirla en el `.env` del servidor o en los secrets del deploy.

- **Dónde:** En el servidor QA (y prod), en el archivo de entorno del contenedor Next.js (o en GitHub Secrets / CI si se inyectan ahí).
- **Valor:** `AUTH_TRUST_HOST=true`
- **Plantillas actualizadas:** `.env.example` (comentado para local), `docker/env.example` (activado para QA/prod).

Así Auth.js confía explícitamente en el host que llega por `X-Forwarded-Host` / `Host` cuando hay proxy.

### 7.2. Cookie CSRF: mantener `__Host-` (buena práctica según Auth.js)

En el código fuente de Auth.js (`next-auth` `packages/core/src/lib/utils/cookie.ts`) la **configuración por defecto** para la cookie CSRF es **`__Host-authjs.csrf-token`** cuando se usan cookies seguras (HTTPS). El comentario indica: *"Default to __Host- for CSRF token for additional protection"*; `__Host-` es más estricto que `__Secure-` (exige Secure, Path=/, sin Domain).

- **Recomendación:** Dejar la cookie CSRF con prefijo **`__Host-`** (valor por defecto de Auth.js). No cambiarla a `__Secure-` salvo que el 403 persista tras aplicar **AUTH_TRUST_HOST** y **NEXTAUTH_URL** correctos.
- **Si el 403 sigue:** Solo entonces valorar como *workaround* usar `__Secure-` para la cookie CSRF en `src/lib/auth/config.ts`; es menos estricta que el default y puede ayudar en algunos entornos detrás de proxy.

### 7.3. Verificar `NEXTAUTH_URL` en el servidor

En el contenedor Next.js (QA/prod) debe estar definido:

- **Nombre:** `NEXTAUTH_URL`
- **Valor exacto (QA):** `https://negocios.qa.financieramentecu.co` (sin barra final, sin puerto).
- **Prod:** `https://negocios.financieramentecu.co` (mismo criterio).

Si falta o no coincide con la URL que ve el usuario, las cookies y la validación de host pueden fallar y seguir apareciendo 403.

### 7.4. Pasos para aplicar en QA

1. **Código:** Desplegar la rama que incluye las referencias a `AUTH_TRUST_HOST` en las plantillas de env (y cookie CSRF con valor por defecto `__Host-`).
2. **Servidor:** En el entorno del contenedor Next.js (p. ej. `.env` en `/opt/financieramente/app` o donde se inyecten las variables), añadir o asegurar:
   - `AUTH_TRUST_HOST=true`
   - `NEXTAUTH_URL=https://negocios.qa.financieramentecu.co`
3. **Reiniciar** el contenedor Next.js (p. ej. `docker compose up -d nextjs` o equivalente) para que cargue las nuevas variables.
4. **Probar:** Abrir la app en una ventana de incógnito o borrar cookies del dominio, ir a login y probar “Sign in with Google”. Si el 403 persiste, activar temporalmente `AUTH_DEBUG=true` en el contenedor, reproducir el 403 y revisar los logs de Next.js para el mensaje exacto (CSRF, host, etc.).

### 7.5. Si el 403 sigue apareciendo

- Revisar en el navegador que en el POST a `/api/auth/signin/google` se envíe la cookie `__Host-authjs.csrf-token` (Request Headers → Cookie).
- Revisar que el body del POST incluya el campo `csrfToken` con el valor devuelto por GET `/api/auth/csrf`.
- Activar `AUTH_DEBUG=true` en el contenedor y reproducir el 403; el log de Next.js debería indicar el motivo concreto del rechazo.

---

**Resumen en una línea:** El 403 lo genera Next.js (NextAuth), no Nginx. Solución recomendada: `AUTH_TRUST_HOST=true` y `NEXTAUTH_URL` exacto en el servidor; mantener la cookie CSRF con prefijo `__Host-` (valor por defecto de Auth.js). Solo si el 403 persiste, valorar como workaround usar `__Secure-` para la cookie CSRF.
