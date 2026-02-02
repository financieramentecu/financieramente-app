# Configuración de Dominio y SSL - Financieramente

Esta guía describe cómo configurar el dominio y certificados SSL para los ambientes QA y Producción.

## Dominios Configurados

- **QA**: `negocios.qa.financieramentecu.co`
- **Producción**: `negocios.financieramentecu.co`

## Arquitectura DNS

Los dominios están configurados en Hostinger y apuntan a los droplets de Digital Ocean:

- QA Domain → `64.225.11.130` (s-1vcpu-1gb droplet)
- Prod Domain → [PROD_IP] (cuando se cree el droplet de producción)

## Requisitos Previos

1. Dominio configurado en Hostinger con registro A apuntando a la IP del droplet
2. DNS propagado (verificar con `nslookup` o herramientas online)
3. Puerto 443 abierto en el firewall (configurado vía Terraform)
4. Acceso SSH al servidor

## Instalación de SSL

### Fase 1: Conectar al Servidor

```bash
# Conectar al servidor QA
ssh root@64.225.11.130 -i ~/.ssh/droplet_deploy

# O usar el script de infraestructura
./scripts/infrastructure.sh connect-qa
```

### Fase 2: Instalar Certbot (Solo una vez)

Si el droplet ya existe y no tiene Certbot instalado:

```bash
# Actualizar paquetes
apt-get update

# Instalar Certbot
apt-get install -y certbot
```

Nota: Los droplets nuevos se crean automáticamente con Certbot instalado.

### Fase 3: Configurar SSL

Ejecutar el script de configuración SSL:

```bash
# Para QA
cd /opt/financieramente
chmod +x terraform/scripts/setup-ssl.sh
./terraform/scripts/setup-ssl.sh qa negocios.qa.financieramentecu.co

# El script:
# 1. Detiene Nginx temporalmente
# 2. Obtiene certificados con Certbot
# 3. Copia certificados al directorio de Docker
# 4. Reinicia servicios
# 5. Verifica que HTTPS funciona
```

### Fase 4: Configurar Renovación Automática

El script de renovación está en el servidor en `/opt/financieramente/app/terraform/scripts/ssl-renew.sh`. Configurar cron job (idempotente: quita entradas antiguas y añade la correcta):

```bash
# Para QA (renovación semanal, domingos 03:00)
(crontab -l 2>/dev/null | grep -v 'ssl-renew.sh' || true
 echo "0 3 * * 0 /opt/financieramente/app/terraform/scripts/ssl-renew.sh qa >> /var/log/financieramente/ssl-renew-cron.log 2>&1") | crontab -

# Para Prod (renovación diaria a las 03:00)
(crontab -l 2>/dev/null | grep -v 'ssl-renew.sh' || true
 echo "0 3 * * * /opt/financieramente/app/terraform/scripts/ssl-renew.sh prod >> /var/log/financieramente/ssl-renew-cron.log 2>&1") | crontab -

# Verificar configuración
crontab -l
```

## Verificación

### Verificar Certificado

```bash
# Ver certificados instalados
certbot certificates

# Ver detalles del certificado (ruta real en servidor: docker/nginx/ssl)
openssl x509 -in /opt/financieramente/docker/nginx/ssl/cert.pem -noout -dates

# Ver fecha de expiración
echo | openssl s_client -servername negocios.qa.financieramentecu.co -connect negocios.qa.financieramentecu.co:443 2>/dev/null | openssl x509 -noout -dates
```

### Verificar HTTPS

```bash
# Verificar que responde
curl -I https://negocios.qa.financieramentecu.co/health

# Ver certificado en el navegador
# https://negocios.qa.financieramentecu.co
```

### Verificar Logs

```bash
# Ver logs de renovación (cron)
tail -f /var/log/financieramente/ssl-renew-cron.log

# Ver logs de Nginx
docker-compose -f /opt/financieramente/docker/docker-compose.qa.yml logs nginx
```

## Renovación Manual

Si la renovación automática falla:

```bash
# Renovar manualmente (ruta en servidor: app/terraform/scripts/)
/opt/financieramente/app/terraform/scripts/ssl-renew.sh qa   # QA
/opt/financieramente/app/terraform/scripts/ssl-renew.sh prod # Prod

# O con Certbot directamente
certbot renew --force-renewal
```

### Certificado ya expirado

Si el certificado **ya está expirado** (por ejemplo porque el cron falló por ruta incorrecta), hay que hacer **una renovación manual única**:

1. Conectar por SSH al servidor (QA o Prod).
2. Ejecutar una vez el script de renovación:
   ```bash
   /opt/financieramente/app/terraform/scripts/ssl-renew.sh qa   # QA
   # o
   /opt/financieramente/app/terraform/scripts/ssl-renew.sh prod # Prod
   ```
3. Si falla (p. ej. puerto 80 ocupado), renovar con Certbot y copiar cert/key:
   ```bash
   certbot renew --force-renewal
   cp /etc/letsencrypt/live/<dominio>/fullchain.pem /opt/financieramente/docker/nginx/ssl/cert.pem
   cp /etc/letsencrypt/live/<dominio>/privkey.pem /opt/financieramente/docker/nginx/ssl/key.pem
   docker-compose -f /opt/financieramente/docker/docker-compose.qa.yml restart nginx  # o .prod
   ```
4. Tras corregir el crontab (Fase 4), el cron volverá a ejecutarse en el siguiente horario programado; esta renovación manual es **solo para recuperar el certificado expirado una vez**.

## Troubleshooting

### Error: "Domain doesn't resolve"

**Causa**: DNS no está configurado o no ha propagado

**Solución**:

```bash
# Verificar DNS
nslookup negocios.qa.financieramentecu.co

# Debe mostrar: 64.225.11.130
# Si no, configurar DNS en Hostinger y esperar propagación
```

### Error: "Port 80 is already in use"

**Causa**: Certbot necesita el puerto 80 libre para verificación

**Solución**:

```bash
# Detener Nginx temporalmente
docker-compose -f /opt/financieramente/docker/docker-compose.qa.yml stop nginx

# Ejecutar Certbot
certbot certonly --standalone -d negocios.qa.financieramentecu.co

# Reiniciar Nginx
docker-compose -f /opt/financieramente/docker/docker-compose.qa.yml start nginx
```

### Certificado Expirado

**Causa**: Renovación automática falló (p. ej. cron con ruta incorrecta).

**Solución**: Ver sección **Certificado ya expirado** en Renovación Manual. Resumen:

```bash
# Opción 1: Usar el script (recomendado)
/opt/financieramente/app/terraform/scripts/ssl-renew.sh qa   # QA

# Opción 2: Certbot + copiar cert/key (ruta real: docker/nginx/ssl)
certbot renew --force-renewal
cp /etc/letsencrypt/live/negocios.qa.financieramentecu.co/fullchain.pem /opt/financieramente/docker/nginx/ssl/cert.pem
cp /etc/letsencrypt/live/negocios.qa.financieramentecu.co/privkey.pem /opt/financieramente/docker/nginx/ssl/key.pem
docker-compose -f /opt/financieramente/docker/docker-compose.qa.yml restart nginx
```

## Comandos Útiles

```bash
# Ver certificados instalados
certbot certificates

# Renovar certificados
certbot renew

# Renovar forzadamente
certbot renew --force-renewal

# Test renew (sin renovar realmente)
certbot renew --dry-run

# Ver logs de Certbot
tail -f /var/log/letsencrypt/letsencrypt.log
```

## Seguridad

### Headers de Seguridad

El servidor Nginx está configurado con los siguientes headers de seguridad:

- **HSTS**: Forzar HTTPS por 1 año
- **X-Frame-Options**: Prevenir clickjacking
- **X-Content-Type-Options**: Prevenir MIME sniffing
- **X-XSS-Protection**: Protección XSS
- **CSP**: Content Security Policy
- **Referrer-Policy**: Control de información de referrer

### Cifrados SSL

Solo se permiten protocolos TLS 1.2 y 1.3 con cifrados modernos y seguros.

## Próximos Pasos

Después de configurar SSL, puedes:

1. Habilitar redirección HTTP → HTTPS (descomentar en nginx.conf)
2. Configurar múltiples dominios
3. Agregar subdominios adicionales
4. Configurar backups de certificados

Para más información, consultar [INFRASTRUCTURE.md](./INFRASTRUCTURE.md).
