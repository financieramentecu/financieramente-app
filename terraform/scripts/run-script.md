
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
(crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/financieramente/terraform/scripts/ssl-renew.sh qa >> /var/log/financieramente/ssl-renew-cron.log 2>&1") | crontab -

## Para Producción: renovación diaria a las 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/financieramente/terraform/scripts/ssl-renew.sh prod >> /var/log/financieramente/ssl-renew-cron.log 2>&1") | crontab -

## Verificar
crontab -l