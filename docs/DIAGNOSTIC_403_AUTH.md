# Diagnóstico 403 en login/signout (QA)

Determina si el **403 Forbidden** en `/api/auth/signout` (y login) lo devuelve **Nginx** o **Next.js (NextAuth)**.

## Cómo ejecutar el diagnóstico

Desde tu máquina (con SSH al droplet QA):

### Opción A: Script que hace SSH por secciones

```bash
./scripts/diagnose-403-auth.sh
```

Con host y clave explícitos:

```bash
QA_HOST=64.225.11.130 SSH_KEY=~/.ssh/droplet_deploy ./scripts/diagnose-403-auth.sh
```

### Opción B: Script que corre todo en el droplet (recomendado si hay timeout)

Una sola sesión SSH; todo el trabajo corre en el servidor:

```bash
ssh -o ConnectTimeout=20 -i ~/.ssh/droplet_deploy root@64.225.11.130 'bash -s' < scripts/diagnose-403-remote.sh
```

Guardar salida en archivo:

```bash
ssh -o ConnectTimeout=20 -i ~/.ssh/droplet_deploy root@64.225.11.130 'bash -s' < scripts/diagnose-403-remote.sh > /tmp/diagnose-403.txt 2>&1
cat /tmp/diagnose-403.txt
```

## Qué revisa el diagnóstico

1. **Nginx access.log** – Peticiones a `/api/auth/` y respuestas con status 403.
2. **Nginx error.log** – Errores recientes de Nginx.
3. **Logs Next.js** – Líneas con auth, signout, 403, csrf.
4. **Variables de entorno** – `NEXTAUTH_URL`, `NODE_ENV` en el contenedor Next.js.
5. **POST signout directo a Next.js** (puerto 3000) – Código HTTP sin pasar por Nginx.
6. **POST signout vía Nginx** (puerto 80) – Código HTTP pasando por Nginx.

## Cómo interpretar el resultado

| Observación | Conclusión |
|-------------|------------|
| En (1) hay líneas con ` 403 ` para `/api/auth/signout` | El 403 lo devuelve el **upstream (Next.js)**; Nginx solo reenvía la respuesta. |
| En (4) hay mensajes de CSRF o 403 | El 403 lo genera **NextAuth** (validación CSRF/origen). |
| (5) `NEXTAUTH_URL` distinto de `https://negocios.qa.financieramentecu.co` | Corregir la variable en el `.env` del deploy QA. |
| (6) y (7) ambos 403 | Next.js devuelve 403 (p. ej. NextAuth CSRF). |
| (6) = 200 o 302 y (7) = 403 | Sería Nginx devolviendo 403 (poco probable con la config actual). |

## Próximos pasos según quien devuelva el 403

- **Si el 403 lo devuelve NextAuth**: Revisar `NEXTAUTH_URL` en el contenedor QA, cookies `__Host-authjs.*` (mismo host, HTTPS), y activar debug de NextAuth temporalmente para ver el mensaje exacto (CSRF, etc.).
- **Si el 403 lo devuelve Nginx**: Revisar `docker/nginx/nginx.conf` (location `/api/auth/`, reglas `deny`, módulos que puedan devolver 403).

Ver también el plan en `.cursor/plans/` o el resumen en la conversación sobre 403 login/signout.

---

## 403 intermitente (funciona tras reiniciar el contenedor Next.js)

### Causa

Cuando el 403 aparece **solo después de un tiempo** y **desaparece al reiniciar el contenedor Next.js**, la causa suele ser la **reutilización de conexiones keepalive** entre Nginx y Next.js:

1. Nginx mantiene conexiones abiertas al upstream (Next.js) para reutilizarlas (keepalive).
2. Tras un rato en idle, Node.js/Next.js puede cerrar la conexión por su lado o la conexión queda en un estado inconsistente.
3. Nginx reutiliza esa conexión para un nuevo POST (login/signout); el upstream recibe la petición en una conexión que ya cerró o en mal estado y puede responder **403** o comportarse de forma errática.
4. Al reiniciar Next.js, todas las conexiones se cierran y las nuevas son correctas, por eso vuelve a funcionar.

Referencias: [Nginx upstream keepalive stale connection](https://stackoverflow.com/questions/66312816/nginx-shows-bad-gateway-when-upstream-server-restart-and-not-back-to-normal), [Auth.js 403 behind proxy](https://authjs.dev/getting-started/deployment).

### Solución aplicada

En [docker/nginx/nginx.conf](docker/nginx/nginx.conf), en los bloques **location /api/auth/** (HTTP y HTTPS) se fuerza **Connection "close"** hacia el upstream:

- Las peticiones a `/api/auth/*` **no** reutilizan conexiones keepalive: cada request usa una conexión nueva hacia Next.js.
- Así se evita reutilizar una conexión que el backend ya cerró o dejó en mal estado.
- El resto de rutas sigue usando keepalive (mejor rendimiento); solo auth usa conexión nueva.

Tras desplegar esta configuración, recargar Nginx en el servidor (o reiniciar el contenedor nginx) para aplicarla.

### Si el 403 continúa

- Comprobar **NEXTAUTH_URL** en el contenedor (debe ser exactamente la URL pública, p. ej. `https://negocios.qa.financieramentecu.co`).
- Revisar que las cookies `__Host-authjs.csrf-token` y `__Secure-authjs.session-token` se envíen en el POST (mismo dominio, HTTPS).
- Activar debug de NextAuth temporalmente y revisar logs de Next.js para ver el motivo exacto del 403 (CSRF, origen, etc.).

---

## Análisis de logs (ejemplo real)

Con logs obtenidos con `docker-compose -f docker/docker-compose.qa.yml logs` (o equivalente):

- **Todas las peticiones POST** aparecen con **403** y cuerpo pequeño (0 o 5 bytes). Eso incluye:
  - `POST /api/auth/signout` (tu caso de signout),
  - `POST /`, `POST /_next/rsc`, `POST /_next/server-actions`, `POST /sigin`, `POST /apps`, etc.
- En Nginx el **403 no lo genera** el rate limiting (`limit_req` devuelve 503, no 403) ni las reglas `deny` actuales (solo afectan a `wp-admin`, `wp-login`, `xmlrpc`). La ruta `/api/auth/` tiene su propio `location` sin `limit_req` y hace proxy a Next.js.
- **Conclusión**: El 403 lo está devolviendo el **upstream (Next.js)** y Nginx solo lo reenvía y lo registra. Para `/api/auth/signout` lo más probable es **NextAuth** (p. ej. validación CSRF u origen).
- **Próximos pasos**: Revisar `NEXTAUTH_URL` en el contenedor, que las cookies `__Host-authjs.*` se envíen al mismo host (HTTPS) y, si usas Cloudflare u otro proxy delante, comprobar que no esté devolviendo 403 (WAF, “Under Attack”, etc.). El aviso de Compose sobre `version` se evita quitando la línea `version: "3.8"` del archivo (ya aplicado en `docker/docker-compose.qa.yml` y `docker-compose.prod.yml`).

---

## Obtención manual de logs (sin scripts)

Contexto según la documentación del repo:

- **Docker**: En el repo los archivos de Compose están en la carpeta **docker/** ([docker/docker-compose.qa.yml](docker/docker-compose.qa.yml), [docker/docker-compose.prod.yml](docker/docker-compose.prod.yml)). Esos archivos definen los servicios; los logs de Nginx están **dentro del contenedor** en `/var/log/nginx` (volumen `nginx_logs`). Los nombres de contenedor son fijos: `financieramente-nginx-qa`, `financieramente-nextjs-qa`, `financieramente-postgres-qa`. La config de Nginx está en [docker/nginx/nginx.conf](docker/nginx/nginx.conf).
- **Terraform**: El deploy usa [terraform/scripts/deploy-app.sh](terraform/scripts/deploy-app.sh); la app queda en `/opt/financieramente/app`. En el host, los logs del deploy y diagnósticos están en `/var/log/financieramente/` (ver [terraform/scripts/diagnostic.sh](terraform/scripts/diagnostic.sh)).
- **SSH**: Según [terraform/outputs.tf](terraform/outputs.tf): `ssh root@<IP_QA> -i ~/.ssh/droplet_deploy`. Sustituir `<IP_QA>` por la IP del droplet QA (p. ej. `64.225.11.130`).

### 1. Conectarte al droplet

```bash
ssh -i ~/.ssh/droplet_deploy root@64.225.11.130
```

### 2. Ver que los contenedores estén arriba (opcional)

Desde cualquier directorio en el droplet:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

Deberías ver `financieramente-nginx-qa`, `financieramente-nextjs-qa`, `financieramente-postgres-qa`. Si en el servidor el código está en `/opt/financieramente/app` con la misma estructura que el repo (carpeta **docker/** dentro de app), puedes usar:

```bash
cd /opt/financieramente/app && docker-compose -f docker/docker-compose.qa.yml ps
```

### 3. Logs de Nginx (dentro del contenedor)

Nginx corre en Docker; los logs están en el contenedor ([docker/docker-compose.qa.yml](docker/docker-compose.qa.yml) monta `nginx_logs:/var/log/nginx`). Rutas internas según [docker/nginx/nginx.conf](docker/nginx/nginx.conf): `access.log`, `error.log`.

**Últimas peticiones a `/api/auth/`:**

```bash
docker exec financieramente-nginx-qa tail -200 /var/log/nginx/access.log | grep '/api/auth/'
```

**Peticiones con status 403:**

```bash
docker exec financieramente-nginx-qa tail -200 /var/log/nginx/access.log | grep ' 403 '
```

**Errores recientes de Nginx:**

```bash
docker exec financieramente-nginx-qa tail -30 /var/log/nginx/error.log
```

### 4. Logs de la app Next.js (contenedor)

```bash
docker logs financieramente-nextjs-qa --tail 150 2>&1 | grep -iE 'auth|signout|403|csrf|forbidden'
```

Ver más líneas sin filtrar:

```bash
docker logs financieramente-nextjs-qa --tail 200 2>&1
```

### 5. Variables de entorno de Next.js (NEXTAUTH_URL, etc.)

```bash
docker exec financieramente-nextjs-qa env | grep -E 'NEXTAUTH_URL|AUTH_SECRET|NODE_ENV'
```

### 6. Pruebas desde el servidor (quién devuelve el 403)

**POST signout directo a Next.js (puerto 3000, sin Nginx):**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/auth/signout \
  -H 'Content-Type: application/x-www-form-urlencoded' -d 'csrfToken=test&callbackUrl=/'
```

**POST signout vía Nginx (puerto 80):**

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1/api/auth/signout \
  -H 'Host: negocios.qa.financieramentecu.co' \
  -H 'Content-Type: application/x-www-form-urlencoded' -d 'csrfToken=test&callbackUrl=/'
```

Si ambos devuelven `403`, el 403 lo genera Next.js (NextAuth). Si solo el segundo devuelve 403, revisar Nginx.

### 7. Logs en el host (deploy, diagnóstico)

Según [terraform/scripts/deploy-app.sh](terraform/scripts/deploy-app.sh) y [terraform/scripts/diagnostic.sh](terraform/scripts/diagnostic.sh):

```bash
tail -100 /var/log/financieramente/deploy.log
tail -100 /var/log/financieramente/diagnostic.log
```

### 8. Usar docker-compose para ver logs de todos los servicios

En el repo, los compose están en la carpeta **docker/**; en el servidor, si la estructura es la misma (p. ej. `/opt/financieramente/app/docker/`), usa el archivo dentro de **docker/**:

```bash
cd /opt/financieramente/app
docker-compose -f docker/docker-compose.qa.yml logs --tail=50 nginx
docker-compose -f docker/docker-compose.qa.yml logs --tail=50 nextjs
```

O entrando en la carpeta docker:

```bash
cd /opt/financieramente/app/docker
docker-compose -f docker-compose.qa.yml logs --tail=50 nginx
docker-compose -f docker-compose.qa.yml logs --tail=50 nextjs
```

Salir del droplet: `exit`.
