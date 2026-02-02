---
name: Fix SSL renewal
overview: Resolver la renovación automática de SSL en QA y Prod corrigiendo el path del cron para que apunte a /opt/financieramente/app/terraform/scripts/ssl-renew.sh (donde el script ya existe), replicando el cambio en deploy-qa.yml y deploy-prod.yml, y documentando la renovación manual única del certificado expirado en QA.
todos: []
isProject: false
---

# Plan: Resolver renovación automática de certificado SSL

## Contexto del problema

- **Cron** en el servidor invoca `/opt/financieramente/terraform/scripts/ssl-renew.sh` (sin `app/`).
- El script **sí existe** en el servidor, pero en `/opt/financieramente/app/terraform/scripts/ssl-renew.sh` (con `app/`).
- Al faltar `app/` en el path del cron, cada domingo a las 03:00 el cron falla con `not found`.
- El certificado Let's Encrypt para `negocios.qa.financieramentecu.co` está **expirado** desde el 27 ene 2026.

## Estrategia

1. Corregir el crontab para que apunte a la ruta real del script: `/opt/financieramente/app/terraform/scripts/ssl-renew.sh`.
2. Opcional: en el workflow de deploy, asegurar ese path en el cron (idempotente) para que no se pierda en cambios manuales.
3. Documentar la ruta correcta y la renovación manual única del certificado expirado.

---

## 1. Corregir crontab en el servidor (ruta con `app/`)

**Acción:** Actualizar la entrada de cron para usar la ruta donde el script ya existe.

- Ruta correcta del script: `/opt/financieramente/app/terraform/scripts/ssl-renew.sh`
- Línea de cron a usar:  
`0 3 * * 0 /opt/financieramente/app/terraform/scripts/ssl-renew.sh qa >> /var/log/financieramente/ssl-renew-cron.log 2>&1`

**Opción A – Solo en servidor (manual):** Conectar por SSH y ejecutar:

```bash
# Quitar entrada antigua y añadir la correcta
(crontab -l 2>/dev/null | grep -v 'ssl-renew.sh' || true
 echo "0 3 * * 0 /opt/financieramente/app/terraform/scripts/ssl-renew.sh qa >> /var/log/financieramente/ssl-renew-cron.log 2>&1") | crontab -
crontab -l
```

**Opción B – En el workflow (recomendado):** En [.github/workflows/deploy-qa.yml](.github/workflows/deploy-qa.yml) y en [.github/workflows/deploy-prod.yml](.github/workflows/deploy-prod.yml), dentro del script SSH del paso "Deploy application" (o en un paso posterior que ejecute comandos en el servidor), añadir un bloque que asegure el crontab con la ruta correcta:

- **QA:** `0 3 * * 0 /opt/financieramente/app/terraform/scripts/ssl-renew.sh qa >> /var/log/financieramente/ssl-renew-cron.log 2>&1`
- **Prod:** `0 3 * * * /opt/financieramente/app/terraform/scripts/ssl-renew.sh prod >> /var/log/financieramente/ssl-renew-cron.log 2>&1` (renovación diaria a las 03:00)

Lógica idempotente en ambos workflows (quitar líneas con `ssl-renew.sh` y añadir la correcta según entorno).

No es necesario copiar el script a otra ruta si ya está en `app/terraform/scripts/`. Si en el futuro el deploy reemplazara `app/` y se perdiera esa carpeta, se podría añadir un paso que copie `terraform/scripts/ssl-renew.sh`; por ahora no es obligatorio.

---

## 2. Renovación manual única del certificado (documentación + ejecución manual)

El certificado ya está expirado. Let's Encrypt permite renovar certificados expirados con `certbot renew --force-renewal` (o ejecutando el script una vez con el puerto 80 libre).

- **No** automatizar la renovación forzada en el workflow (podría afectar rate limits; es un caso puntual).
- En [docs/DOMAIN_SSL_SETUP.md](docs/DOMAIN_SSL_SETUP.md):
  - Añadir una subsección **"Certificado ya expirado"** (o ampliar la existente) que indique:
    - Conectar por SSH al servidor.
    - Ejecutar una vez:  
    `/opt/financieramente/app/terraform/scripts/ssl-renew.sh qa`  
    (o, si falla, los pasos manuales con `certbot renew --force-renewal`, copiar cert/key a `docker/nginx/ssl/` y reiniciar nginx).
  - Dejar claro que esto es una acción **única** hasta que el cron vuelva a ejecutarse el siguiente domingo.

Tras corregir el cron, quien tenga acceso hará **una vez** la renovación manual ejecutando ese script (o los pasos equivalentes de la doc).

---

## 3. Unificar documentación de rutas y cron

- **[docs/DOMAIN_SSL_SETUP.md](docs/DOMAIN_SSL_SETUP.md):**
  - En "Fase 4: Configurar Renovación Automática", usar la ruta real del servidor: `/opt/financieramente/app/terraform/scripts/ssl-renew.sh`.
  - Corregir rutas de verificación si hace falta: el script y el servidor usan `SSL_DIR=/opt/financieramente/docker/nginx/ssl`; en la doc aparecen también rutas como `/opt/financieramente/qa/nginx/ssl` (no existen en el servidor). Unificar a `docker/nginx/ssl`.
  - En "Verificar Logs", usar:  
  `docker-compose -f /opt/financieramente/docker/docker-compose.qa.yml logs nginx`
- **[terraform/scripts/run-script.md](terraform/scripts/run-script.md):**
  - Cambiar las entradas de crontab de ejemplo para que usen `/opt/financieramente/app/terraform/scripts/ssl-renew.sh` (ruta donde el script existe en el servidor).

---

## 4. Replicar el mismo cambio para Producción

El mismo problema (cron con path sin `app/`) puede existir en el servidor de producción. Replicar la corrección:

- **Ruta del script en prod:** `/opt/financieramente/app/terraform/scripts/ssl-renew.sh` (misma estructura que QA).
- **Línea de cron para prod:** `0 3 * * * /opt/financieramente/app/terraform/scripts/ssl-renew.sh prod >> /var/log/financieramente/ssl-renew-cron.log 2>&1` (diario a las 03:00, según [docs/DOMAIN_SSL_SETUP.md](docs/DOMAIN_SSL_SETUP.md)).

**Acciones:**

1. **En [.github/workflows/deploy-prod.yml](.github/workflows/deploy-prod.yml):** Añadir en el script SSH del deploy (por ejemplo al final del paso "Deploy application" o en un paso "Ensure SSL renewal cron") el mismo bloque idempotente de crontab, pero con la línea de prod:
  ```bash
   (crontab -l 2>/dev/null | grep -v 'ssl-renew.sh' || true
    echo "0 3 * * * /opt/financieramente/app/terraform/scripts/ssl-renew.sh prod >> /var/log/financieramente/ssl-renew-cron.log 2>&1") | crontab -
  ```
2. **Documentación:** En [docs/DOMAIN_SSL_SETUP.md](docs/DOMAIN_SSL_SETUP.md) y [terraform/scripts/run-script.md](terraform/scripts/run-script.md) las entradas de cron para **QA y Prod** deben usar la ruta `/opt/financieramente/app/terraform/scripts/ssl-renew.sh` (ya cubierto en la sección 3).
3. **Servidor prod (manual, una vez):** Si prod ya tiene un cron con path incorrecto, corregirlo manualmente por SSH o dejar que el próximo deploy lo aplique con el paso anterior.

---

## Orden de implementación sugerido

1. **Workflows:** Añadir en [.github/workflows/deploy-qa.yml](.github/workflows/deploy-qa.yml) y en [.github/workflows/deploy-prod.yml](.github/workflows/deploy-prod.yml) el bloque que asegura el crontab con la ruta `/opt/financieramente/app/terraform/scripts/ssl-renew.sh` (qa en deploy-qa, prod en deploy-prod).
2. **Documentación:** Actualizar [docs/DOMAIN_SSL_SETUP.md](docs/DOMAIN_SSL_SETUP.md) (ruta del script para QA y Prod, rutas SSL/nginx, pasos para certificado expirado) y [terraform/scripts/run-script.md](terraform/scripts/run-script.md) (ejemplos de crontab para QA y Prod).
3. **Cron en servidores (inmediato):** Corregir crontab en QA (y en Prod si aplica) manualmente por SSH, o esperar al próximo deploy para que el workflow lo aplique.
4. **Renovación manual (solo QA):** Ejecutar una vez en el servidor QA `/opt/financieramente/app/terraform/scripts/ssl-renew.sh qa` para renovar el certificado expirado.

---

## Resumen de archivos a tocar


| Archivo                                                                | Cambios                                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [.github/workflows/deploy-qa.yml](.github/workflows/deploy-qa.yml)     | Bloque en el script SSH que asegure el crontab con `/opt/financieramente/app/terraform/scripts/ssl-renew.sh qa` (domingos 03:00).                         |
| [.github/workflows/deploy-prod.yml](.github/workflows/deploy-prod.yml) | Bloque en el script SSH que asegure el crontab con `/opt/financieramente/app/terraform/scripts/ssl-renew.sh prod` (diario 03:00).                         |
| [docs/DOMAIN_SSL_SETUP.md](docs/DOMAIN_SSL_SETUP.md)                   | Ruta del script para QA y Prod `app/terraform/scripts/ssl-renew.sh`, unificar rutas SSL/nginx, documentar renovación manual cuando el certificado expira. |
| [terraform/scripts/run-script.md](terraform/scripts/run-script.md)     | Ejemplos de crontab para QA y Prod con `/opt/financieramente/app/terraform/scripts/ssl-renew.sh`.                                                         |


No se modifican el contenido de `ssl-renew.sh` ni la lógica de Certbot; solo la ruta en el cron y la documentación.