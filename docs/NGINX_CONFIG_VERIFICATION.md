# Verificación de la configuración Nginx (docker/nginx/nginx.conf)

Revisión según la [documentación oficial de Nginx](https://nginx.org/en/docs/) y buenas prácticas para proxy reverso y Next.js.

## Resumen

La configuración en [docker/nginx/nginx.conf](../docker/nginx/nginx.conf) está correcta para actuar como proxy reverso frente a Next.js: orden de `location`, cabeceras de proxy, timeouts y keepalive son coherentes con la documentación. Se aplicaron dos ajustes menores (keepalive upstream y comentarios).

## Comprobaciones realizadas

### 1. proxy_pass y upstream

- **proxy_pass** sin URI: `proxy_pass http://nextjs;` — el URI de la petición se reenvía tal cual al upstream ([ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)). Correcto.
- **upstream** con nombre `nextjs` y `keepalive 8`: uso correcto de bloque `upstream` para conexiones persistentes.

### 2. Keepalive hacia el upstream

Para que el keepalive hacia el upstream funcione, Nginx requiere:

- `proxy_http_version 1.1;` — presente en todos los `location` que hacen proxy.
- Cabecera **Connection** vacía en peticiones normales (no WebSocket), para no forzar cierre de conexión.

Se ajustó el `map` de WebSocket: en lugar de `'' close;` se usa `'' "";` cuando no hay `Upgrade`. Así, en peticiones normales se envía `Connection: ""` y se permite reutilizar conexiones keepalive; en peticiones WebSocket se sigue enviando `Connection: upgrade`.

### 3. Cabeceras de proxy

En los `location` de proxy están definidas:

- `Host $host`
- `X-Real-IP $remote_addr`
- `X-Forwarded-For $proxy_add_x_forwarded_for`
- `X-Forwarded-Proto $scheme`
- `X-Forwarded-Host $host`

Adecuado para una app detrás del proxy (p. ej. NextAuth con `trustHost`).

### 4. Orden de location y /api/auth/

- **location /api/auth/** tiene prefijo más específico que **location /api/**.
- Nginx elige el prefijo más largo, por lo que `/api/auth/signout` entra en `/api/auth/` y no en `/api/`. Correcto.
- En `/api/auth/` no se aplica `limit_req`; en `/api/` sí (`limit_req zone=api burst=20 nodelay`). Coherente con la intención de no limitar auth.

### 5. Rate limiting

- `limit_req_zone` api: 10r/s; aplicado solo en `location /api/` (no en `/api/auth/`).
- `limit_req_zone` login: definido pero no usado; dejado comentado como reservado para uso futuro (p. ej. signin).
- Ante exceso de tasa, Nginx devuelve **503** por defecto, no 403; los 403 vistos en los logs no provienen del rate limit de Nginx.

### 6. Bloqueo de rutas

- `location ~* /(wp-admin|wp-login|xmlrpc)` con `deny all` — no coincide con `/api/auth/` ni con rutas de Next.js. Correcto.
- `location ~ /\.` y `location ~ \.(env|log|sql)$` — solo archivos sensibles. Correcto.

### 7. Timeouts y reintentos

- `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout` definidos.
- `proxy_next_upstream error timeout http_502 http_503 http_504` con tries y timeout. Adecuado.

### 8. SSL (bloque HTTPS)

- `ssl_protocols TLSv1.2 TLSv1.3`, cifrados modernos, HSTS. Correcto para producción.

### 9. Eventos (use epoll)

- `use epoll` es válido en **Linux** (p. ej. contenedor `nginx:alpine`). En BSD/macOS habría que usar `kqueue` u omitir la directiva. Se dejó un comentario en la config.

### 10. proxy_cache_valid en static/images

- En `/_next/static/` y en las rutas de imágenes se usa `proxy_cache_valid` pero **no** se define `proxy_cache` (no hay `proxy_cache_path` ni `proxy_cache` en el bloque). Por tanto, `proxy_cache_valid` no tiene efecto; sí se aplican los `add_header Cache-Control`. Se documentó en comentarios en la config; si se quiere cache en Nginx, habría que añadir una zona `proxy_cache` y `proxy_cache` en esos `location`.

## Cambios aplicados en la config

1. **Map Connection para keepalive**: `'' close;` → `'' "";` en el `map $http_upgrade $connection_upgrade` para permitir keepalive al upstream en peticiones no WebSocket.
2. **Comentario en events**: aclarar que `use epoll` es solo para Linux.
3. **Comentario en limit_req_zone login**: indicar que la zona está reservada para uso futuro.
4. **Comentarios en static/images**: indicar que `proxy_cache_valid` requiere una zona `proxy_cache` para tener efecto.

## Referencias

- [Module ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Module ngx_http_upstream_module (keepalive)](https://nginx.org/en/docs/http/ngx_http_upstream_module.html#keepalive)
- [Nginx reverse proxy (docs.nginx.com)](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
