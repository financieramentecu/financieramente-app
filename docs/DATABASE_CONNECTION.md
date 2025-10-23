# Conexión a Base de Datos - Guía Completa

Esta guía explica las diferentes opciones para conectarte a las bases de datos desde tu entorno de desarrollo local.

## Opción A: Supabase para Desarrollo (Recomendado) ⭐

### Ventajas
- ✅ Sin instalación local de PostgreSQL
- ✅ Dashboard web para ver datos
- ✅ PostgreSQL real (misma versión que QA/Prod)
- ✅ Backups automáticos
- ✅ SSL incluido
- ✅ Gratis hasta 500MB

### Configuración Paso a Paso

#### 1. Crear Proyecto en Supabase

1. **Ir a Supabase**:
   - URL: https://supabase.com
   - Sign up / Login

2. **Crear Nuevo Proyecto**:
   - Click en "New Project"
   - **Name**: `financieramente-dev`
   - **Database Password**: [genera una contraseña segura]
   - **Region**: US East (más cerca de Digital Ocean NYC)
   - **Pricing Plan**: Free

3. **Esperar Creación**:
   - Wait ~2 minutos mientras se crea el proyecto

#### 2. Obtener Connection String

1. **En Supabase Dashboard**:
   - Project Settings → Database
   - Connection string → URI

2. **Copiar la URL**:
   ```
   postgresql://postgres:[TU-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```

#### 3. Configurar en tu Proyecto Local

**Crear archivo `.env.local`**:
```bash
# Para Prisma con connection pooling (recomendado)
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"

# Variables adicionales
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### 4. Ejecutar Migraciones

```bash
# Crear migración inicial
npx prisma migrate dev --name init

# Las tablas se crean en Supabase automáticamente
```

#### 5. Verificar Conexión

```bash
# Verificar que Prisma puede conectarse
npx prisma db pull

# Ver datos en Supabase Dashboard
# Ir a Table Editor en Supabase
```

### Herramientas de Base de Datos

Puedes usar cualquier herramienta para conectarte a Supabase:

**pgAdmin, DBeaver, DataGrip, etc.**:
```
Host: db.xxxxxxxxxxxx.supabase.co
Port: 5432
Database: postgres
Username: postgres
Password: [TU-PASSWORD]
SSL: Required
```

## Opción B: SSH Tunnel a QA (Para probar con datos reales)

### Cuándo usar esta opción
- ✅ Necesitas probar con datos reales de QA
- ✅ Debugging de problemas específicos de QA
- ✅ Verificar que los datos se ven correctamente

### Configuración Paso a Paso

#### 1. Crear SSH Tunnel

**Túnel manual**:
```bash
ssh -L 5433:localhost:5432 root@[QA_DROPLET_IP] -i ~/.ssh/droplet_deploy
```

**Usar script helper (más fácil)**:
```bash
# El script detecta automáticamente la IP de QA
./scripts/db-tunnel-qa.sh start

# O especificar IP manualmente
QA_DROPLET_IP=164.92.123.45 ./scripts/db-tunnel-qa.sh start
```

#### 2. Configurar Variables de Entorno

**Crear archivo `.env.local`**:
```bash
DATABASE_URL="postgresql://financieramente_user:PASSWORD@localhost:5433/financieramente_qa"
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### 3. Usar el Túnel

```bash
# Verificar que el túnel está activo
./scripts/db-tunnel-qa.sh status

# Probar conexión
./scripts/db-tunnel-qa.sh test

# Detener túnel cuando termines
./scripts/db-tunnel-qa.sh stop
```

### Herramientas de Base de Datos

**pgAdmin, DBeaver, DataGrip, etc.**:
```
Host: localhost
Port: 5433
Database: financieramente_qa
Username: financieramente_user
Password: [POSTGRES_PASSWORD_QA from GitHub Secrets]
```

### Comandos del Script SSH Tunnel

```bash
# Comandos disponibles
./scripts/db-tunnel-qa.sh start    # Crear túnel
./scripts/db-tunnel-qa.sh stop     # Detener túnel
./scripts/db-tunnel-qa.sh status  # Ver estado
./scripts/db-tunnel-qa.sh test    # Probar conexión
./scripts/db-tunnel-qa.sh restart # Reiniciar túnel
```

## Opción C: PostgreSQL Local (Sin internet)

### Cuándo usar esta opción
- ✅ Quieres trabajar completamente offline
- ✅ No tienes conexión a internet estable
- ✅ Quieres máxima velocidad de desarrollo

### Configuración Paso a Paso

#### 1. Instalar PostgreSQL Localmente

**macOS**:
```bash
# Con Homebrew
brew install postgresql@15

# Iniciar servicio
brew services start postgresql@15
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2. Crear Base de Datos

```bash
# Crear usuario y base de datos
createdb financieramente_dev

# O con psql
psql postgres
CREATE USER dev_user WITH PASSWORD 'dev_password';
CREATE DATABASE financieramente_dev OWNER dev_user;
GRANT ALL PRIVILEGES ON DATABASE financieramente_dev TO dev_user;
\q
```

#### 3. Configurar Variables de Entorno

**Crear archivo `.env.local`**:
```bash
DATABASE_URL="postgresql://dev_user:dev_password@localhost:5432/financieramente_dev"
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### 4. Ejecutar Migraciones

```bash
# Crear migración inicial
npx prisma migrate dev --name init

# Las tablas se crean en PostgreSQL local
```

## Comparación de Opciones

| Aspecto | Supabase | SSH Tunnel | PostgreSQL Local |
|---------|----------|------------|------------------|
| **Velocidad** | Media | Media | Alta |
| **Datos Reales** | ❌ | ✅ | ❌ |
| **Instalación** | ❌ | ❌ | ✅ |
| **Internet Requerido** | ✅ | ✅ | ❌ |
| **Dashboard Web** | ✅ | ❌ | ❌ |
| **Backups** | ✅ | ❌ | ❌ |
| **Costo** | Gratis | Gratis | Gratis |

## Flujo de Trabajo Recomendado

### Desarrollo Diario
1. **Usar Supabase** para desarrollo normal
2. **Datos de prueba** en Supabase
3. **Migraciones** se aplican a Supabase

### Debugging con Datos Reales
1. **Usar SSH Tunnel** cuando necesites datos reales de QA
2. **Conectar** a QA temporalmente
3. **Desconectar** cuando termines

### Trabajo Offline
1. **Usar PostgreSQL Local** cuando no tengas internet
2. **Sincronizar** cambios cuando vuelvas a tener conexión

## Troubleshooting

### Supabase Connection Failed

```bash
# Verificar URL de conexión
echo $DATABASE_URL

# Probar conexión directa
psql "postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"

# Verificar que el proyecto esté activo en Supabase Dashboard
```

### SSH Tunnel Connection Failed

```bash
# Verificar que el túnel esté activo
./scripts/db-tunnel-qa.sh status

# Verificar que QA Droplet esté corriendo
./scripts/infrastructure.sh status

# Verificar SSH key
ssh -i ~/.ssh/droplet_deploy root@[QA_IP] "echo 'SSH works'"
```

### PostgreSQL Local Connection Failed

```bash
# Verificar que PostgreSQL esté corriendo
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Verificar que la base de datos existe
psql -l | grep financieramente_dev

# Verificar permisos de usuario
psql postgres -c "\du"
```

## Comandos Útiles

```bash
# Verificar conexión a cualquier base de datos
npx prisma db pull

# Resetear base de datos local
npx prisma migrate reset

# Ver datos en Supabase Dashboard
# Ir a Table Editor

# Ver logs de PostgreSQL local
tail -f /usr/local/var/log/postgres.log  # macOS
tail -f /var/log/postgresql/postgresql-*.log  # Linux

# Backup de base de datos local
pg_dump financieramente_dev > backup.sql

# Restaurar backup
psql financieramente_dev < backup.sql
```
