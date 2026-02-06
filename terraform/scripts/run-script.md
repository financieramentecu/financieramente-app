
## Setup SSL
´´´
bash setup-ssl.sh qa negocios.qa.financieramentecu.co
´´´

# Renew SSL
### Crear directorio de logs
´´´
mkdir -p /var/log/financieramente
´´´

## Para QA: renovación semanal (domingos a las 3 AM)
Ruta del script en servidor: `/opt/financieramente/terraform/scripts/ssl-renew.sh` (el deploy copia el script ahí; no existe carpeta `app/` en el servidor).
(crontab -l 2>/dev/null | grep -v 'ssl-renew.sh' || true
 echo "0 3 * * 0 /opt/financieramente/terraform/scripts/ssl-renew.sh qa >> /var/log/financieramente/ssl-renew-cron.log 2>&1") | crontab -

## Para Producción: renovación diaria a las 3 AM
(crontab -l 2>/dev/null | grep -v 'ssl-renew.sh' || true
 echo "0 3 * * * /opt/financieramente/terraform/scripts/ssl-renew.sh prod >> /var/log/financieramente/ssl-renew-cron.log 2>&1") | crontab -

## Verificar
crontab -l