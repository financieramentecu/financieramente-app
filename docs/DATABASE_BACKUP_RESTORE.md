# Backup y Restauración de Base de Datos — Producción

Esta guía cubre el procedimiento completo para hacer backups de la base de datos de producción y restaurarlos. La BD corre en PostgreSQL 15 dentro de un contenedor Docker en el Droplet de Digital Ocean.

## Contexto rápido

| Parámetro | Valor |
|-----------|-------|
| Servidor | Droplet Prod (`PROD_DROPLET_IP`) |
| Directorio app | `/opt/financieramente` |
| Compose file | `docker-compose.prod.yml` |
| Contenedor BD | `postgres` |
| Base de datos | `financieramente_prod` |
| Usuario BD | `financieramente_user` |

---

## 1. Backup manual desde tu máquina

### 1.1 Backup completo (recomendado antes de cualquier deploy)

```bash
# Reemplazá PROD_IP con la IP real del droplet
PROD_IP=<PROD_DROPLET_IP>
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_prod_${TIMESTAMP}.sql"

ssh root@$PROD_IP \
  "cd /opt/financieramente && \
   docker-compose -f docker-compose.prod.yml exec -T postgres \
   pg_dump -U financieramente_user --no-acl --no-owner financieramente_prod" \
  > "$BACKUP_FILE"

echo "Backup guardado en: $BACKUP_FILE"
```

El archivo `.sql` queda en tu máquina local. Guardalo en un lugar seguro.

### 1.2 Backup comprimido (para archivos grandes)

```bash
PROD_IP=<PROD_DROPLET_IP>
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_prod_${TIMESTAMP}.sql.gz"

ssh root@$PROD_IP \
  "cd /opt/financieramente && \
   docker-compose -f docker-compose.prod.yml exec -T postgres \
   pg_dump -U financieramente_user --no-acl --no-owner financieramente_prod | gzip" \
  > "$BACKUP_FILE"

echo "Backup comprimido guardado en: $BACKUP_FILE"
```

---

## 2. Backup en el servidor (sin descargar)

Si querés guardar el backup directo en el droplet (útil antes de un deploy riesgoso):

```bash
PROD_IP=<PROD_DROPLET_IP>
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

ssh root@$PROD_IP "
  mkdir -p /opt/financieramente/backups
  docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
    pg_dump -U financieramente_user --no-acl --no-owner financieramente_prod \
    > /opt/financieramente/backups/backup_${TIMESTAMP}.sql
  echo 'Backup guardado en /opt/financieramente/backups/backup_${TIMESTAMP}.sql'
"
```

Para listar los backups guardados en el servidor:

```bash
ssh root@$PROD_IP "ls -lh /opt/financieramente/backups/"
```

Para descargar un backup guardado en el servidor:

```bash
scp root@$PROD_IP:/opt/financieramente/backups/backup_<TIMESTAMP>.sql ./
```

---

## 3. Restaurar un backup

> **IMPORTANTE**: Restaurar reemplaza TODOS los datos actuales. Hacé un backup del estado actual antes de restaurar.

### 3.1 Restaurar desde tu máquina local

```bash
PROD_IP=<PROD_DROPLET_IP>
BACKUP_FILE="backup_prod_20250521_120000.sql"  # Cambiar por el archivo real

# Paso 1: Subir el backup al servidor
scp "$BACKUP_FILE" root@$PROD_IP:/opt/financieramente/backups/

# Paso 2: Restaurar en el contenedor
ssh root@$PROD_IP "
  docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
    psql -U financieramente_user -d financieramente_prod \
    < /opt/financieramente/backups/$BACKUP_FILE
"
```

### 3.2 Restaurar desde un backup comprimido (.sql.gz)

```bash
PROD_IP=<PROD_DROPLET_IP>
BACKUP_FILE="backup_prod_20250521_120000.sql.gz"

scp "$BACKUP_FILE" root@$PROD_IP:/opt/financieramente/backups/

ssh root@$PROD_IP "
  gunzip -c /opt/financieramente/backups/$BACKUP_FILE | \
  docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
    psql -U financieramente_user -d financieramente_prod
"
```

### 3.3 Restaurar con limpieza previa (drop + recrear schema)

Usá esto si la restauración falla por conflictos de objetos existentes:

```bash
PROD_IP=<PROD_DROPLET_IP>
BACKUP_FILE="backup_prod_20250521_120000.sql"

ssh root@$PROD_IP "
  # Terminar conexiones activas
  docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
    psql -U financieramente_user -d postgres -c \
    \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'financieramente_prod' AND pid <> pg_backend_pid();\"

  # Dropear y recrear la BD
  docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
    psql -U financieramente_user -d postgres -c 'DROP DATABASE IF EXISTS financieramente_prod;'
  
  docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
    psql -U financieramente_user -d postgres -c 'CREATE DATABASE financieramente_prod OWNER financieramente_user;'

  # Restaurar
  docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
    psql -U financieramente_user -d financieramente_prod \
    < /opt/financieramente/backups/$BACKUP_FILE
"
```

---

## 4. Verificar el backup/restauración

```bash
PROD_IP=<PROD_DROPLET_IP>

# Verificar que las tablas existen y tienen datos
ssh root@$PROD_IP "
  docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
    psql -U financieramente_user -d financieramente_prod -c \
    \"SELECT schemaname, tablename, n_live_tup AS rows FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 20;\"
"
```

---

## 5. Procedimiento completo antes de un deploy de riesgo

Seguí este orden exacto:

```bash
PROD_IP=<PROD_DROPLET_IP>
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="pre_deploy_${TIMESTAMP}.sql"

# 1. Backup local
ssh root@$PROD_IP \
  "cd /opt/financieramente && \
   docker-compose -f docker-compose.prod.yml exec -T postgres \
   pg_dump -U financieramente_user --no-acl --no-owner financieramente_prod" \
  > "$BACKUP_FILE"

echo "Backup guardado: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"

# 2. Verificar que el backup no está vacío
[ -s "$BACKUP_FILE" ] && echo "✅ Backup OK" || echo "❌ Backup vacío — NO deployar"

# 3. Recién acá hacés el deploy
```

---

## 6. Backup automático con cron (opcional)

Para programar backups diarios en el servidor:

```bash
# Conectarse al droplet
ssh root@$PROD_IP

# Crear script de backup
cat > /opt/financieramente/scripts/backup-daily.sh << 'EOF'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/financieramente/backups"
mkdir -p "$BACKUP_DIR"

docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
  pg_dump -U financieramente_user --no-acl --no-owner financieramente_prod \
  | gzip > "$BACKUP_DIR/daily_${TIMESTAMP}.sql.gz"

# Conservar solo los últimos 7 backups
ls -t "$BACKUP_DIR"/daily_*.sql.gz | tail -n +8 | xargs rm -f
echo "Backup completado: daily_${TIMESTAMP}.sql.gz"
EOF

chmod +x /opt/financieramente/scripts/backup-daily.sh

# Agregar al cron (todos los días a las 3am)
crontab -e
# Agregar esta línea:
# 0 3 * * * /opt/financieramente/scripts/backup-daily.sh >> /var/log/db-backup.log 2>&1
```

---

## 7. Backup y restauración vía SSH Tunnel (desde tu máquina)

Si preferís no entrar al servidor, podés operar directamente desde tu máquina con el túnel activo. Requiere tener `pg_dump` y `psql` instalados localmente (`brew install postgresql@15`).

### 7.1 Abrir el túnel a producción

```bash
# Puerto 5434 para no chocar con QA (5433) ni Postgres local (5432)
ssh -L 5434:localhost:5432 root@<PROD_DROPLET_IP> -i ~/.ssh/droplet_deploy -N &
TUNNEL_PID=$!
echo "Túnel abierto (PID $TUNNEL_PID)"
```

### 7.2 Backup

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_prod_${TIMESTAMP}.sql"

pg_dump -h localhost -p 5434 -U financieramente_user \
  --no-acl --no-owner financieramente_prod \
  > "$BACKUP_FILE"

echo "Backup guardado: $BACKUP_FILE ($(du -h $BACKUP_FILE | cut -f1))"
```

### 7.3 Backup comprimido

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump -h localhost -p 5434 -U financieramente_user \
  --no-acl --no-owner financieramente_prod \
  | gzip > "backup_prod_${TIMESTAMP}.sql.gz"
```

### 7.4 Restaurar

> **IMPORTANTE**: Esto reemplaza todos los datos actuales. Hacé un backup primero.

```bash
BACKUP_FILE="backup_prod_20250521_120000.sql"

psql -h localhost -p 5434 -U financieramente_user \
  -d financieramente_prod < "$BACKUP_FILE"
```

Desde un `.sql.gz`:

```bash
gunzip -c backup_prod_20250521_120000.sql.gz | \
  psql -h localhost -p 5434 -U financieramente_user -d financieramente_prod
```

### 7.5 Cerrar el túnel

```bash
kill $TUNNEL_PID
# O si perdiste el PID:
pkill -f "ssh -L 5434"
```

---

## Troubleshooting

### `pg_dump` falla con "role does not exist"

El flag `--no-acl --no-owner` evita este problema. Si igualmente falla, verificá que el contenedor esté corriendo:

```bash
ssh root@$PROD_IP "docker-compose -f /opt/financieramente/docker-compose.prod.yml ps"
```

### La restauración falla con "already exists"

Usá el procedimiento de **limpieza previa** del paso 3.3.

### El archivo de backup está vacío

```bash
# Verificar que PostgreSQL responde
ssh root@$PROD_IP \
  "docker-compose -f /opt/financieramente/docker-compose.prod.yml exec -T postgres \
   pg_isready -U financieramente_user -d financieramente_prod"
```

### Error de conexión SSH

```bash
# Verificar que el droplet está encendido
./scripts/droplet-status.sh
```
