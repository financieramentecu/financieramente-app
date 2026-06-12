
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

## Cron: fund payments daily at 6 AM Bogotá time (UTC-5 → 11:00 UTC)
(crontab -l 2>/dev/null | grep -v 'fund-payments' || true
 echo "0 11 * * * curl -fsS -X POST -H \"Authorization: Bearer \$CRON_SECRET\" http://localhost:3000/api/negocios/cron/fund-payments >> /var/log/financieramente/cron-fund-payments.log 2>&1") | crontab -