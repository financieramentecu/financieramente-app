# Conexión a Base de Datos - Guía Completa

Esta guía explica las diferentes opciones para conectarte a las bases de datos desde tu entorno de desarrollo local.

## Opción A: Neon para Desarrollo (Recomendado) ⭐

### ¿Por qué Neon?

- ✅ **Solo Base de Datos**: Perfecto para desarrollo (no necesitas auth/storage)
- ✅ **Branching como Git**: Entornos aislados para cada feature
- ✅ **Serverless Real**: Escala automáticamente, incluso a cero
- ✅ **Perfecto para Prisma**: Optimizado para serverless (Next.js)
- ✅ **Gratis**: 0.5 GB storage + 190 horas compute/mes
- ✅ **Sin ensuciar QA/Prod**: Desarrollo completamente separado

### Ventajas vs Supabase

- 🚀 **Branching**: Crear branches de BD para probar migraciones sin riesgo
- ⚡ **Serverless**: Mejor performance y costo para desarrollo
- 🎯 **Enfoque**: Solo DB, sin features extra que no necesitas

### Configuración Paso a Paso

#### 1. Crear Proyecto en Neon

1. **Ir a Neon**:
   - URL: https://neon.tech
   - Sign up / Login (puedes usar GitHub)

2. **Crear Nuevo Proyecto**:
   - Click en "Create Project"
   - **Name**: `financieramente-dev`
   - **Region**: US East (N. Virginia) - más cerca de Digital Ocean NYC
   - **PostgreSQL Version**: 15 o 16 (recomendado 15 para coincidir con QA/Prod)
   - **Plan**: Free

3. **Esperar Creación**:
   - Wait ~30 segundos mientras se crea el proyecto

#### 2. Obtener Connection String

1. **En Neon Dashboard**:
   - Se muestra automáticamente después de crear el proyecto
   - O ve a: Project → Connection Details

2. **Copiar la URL**:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

#### 3. Configurar en tu Proyecto Local

**Crear archivo `.env.local`**:

```bash
# Neon - Development Database
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Variables adicionales
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Nota**: Con Neon puedes usar el mismo string para `DATABASE_URL` y `DIRECT_URL`, pero Prisma permite tenerlos separados.

#### 4. Ejecutar Migraciones

```bash
# Crear migración inicial
npm run prisma:migrate:dev --name init

# Las tablas se crean en Neon automáticamente
```

#### 5. Verificar Conexión

```bash
# Verificar que Prisma puede conectarse
npm run prisma:db:pull

# Ver datos en Neon Dashboard
# Ir a Neon Dashboard → Tables
```

#### 6. Usar Branching (Opcional pero Recomendado)

**Crear branch para feature**:

```bash
# En Neon Dashboard:
# 1. Ir a Branches
# 2. Click "Create Branch"
# 3. Nombre: feature-nueva-tabla
# 4. Copiar connection string del branch
# 5. Actualizar DATABASE_URL temporalmente en .env.local

# Trabajar en el branch
npm run prisma:migrate:dev --name nueva_tabla

# Si funciona, merge o eliminar branch
# Si falla, simplemente eliminar branch y empezar de nuevo
```

### Herramientas de Base de Datos

Puedes usar cualquier herramienta para conectarte a Neon:

**pgAdmin, DBeaver, DataGrip, etc.**:

```
Host: ep-xxx.us-east-2.aws.neon.tech
Port: 5432
Database: neondb (o el nombre de tu DB)
Username: [del connection string]
Password: [del connection string]
SSL: Required
```

### Ventajas del Branching

Con Neon puedes crear branches de la base de datos para cada feature:

```bash
# Ejemplo de workflow:
# 1. Crear branch "feature-agregar-clawback"
# 2. Actualizar .env.local con connection string del branch
# 3. Crear migraciones en el branch
# 4. Probar todo en el branch
# 5. Si funciona: merge al main branch
# 6. Si falla: eliminar branch (sin afectar nada)
```

Esto es especialmente útil para:

- ✅ Probar migraciones complejas sin riesgo
- ✅ Desarrollar features que requieren cambios de BD
- ✅ Experimentar sin afectar tu DB principal
- ✅ Rollback instantáneo si algo falla

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

## Opción A.1: Supabase (Alternativa)

Si prefieres Supabase en lugar de Neon:

### Configuración

**Crear archivo `.env.local`**:

```bash
# Para Prisma con connection pooling (recomendado)
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
```

### Comparación: Neon vs Supabase

| Aspecto                  | Neon                  | Supabase                  |
| ------------------------ | --------------------- | ------------------------- |
| **Branching**            | ✅ (Feature estrella) | ❌                        |
| **Serverless Real**      | ✅                    | ⚠️ Limitado               |
| **Solo DB**              | ✅                    | ❌ (incluye auth/storage) |
| **Dashboard**            | ⭐⭐⭐                | ⭐⭐⭐⭐⭐                |
| **Gratis**               | 0.5 GB + 190h/mes     | 500 MB                    |
| **Perfecto para Prisma** | ✅✅✅                | ✅✅                      |

**Recomendación**: Neon es mejor para tu caso (solo necesitas DB).

## Comparación de Opciones

| Aspecto                | Neon   | Supabase | SSH Tunnel | PostgreSQL Local |
| ---------------------- | ------ | -------- | ---------- | ---------------- |
| **Velocidad**          | Alta   | Media    | Media      | Alta             |
| **Datos Reales**       | ❌     | ❌       | ✅         | ❌               |
| **Instalación**        | ❌     | ❌       | ❌         | ✅               |
| **Internet Requerido** | ✅     | ✅       | ✅         | ❌               |
| **Dashboard Web**      | ✅     | ✅✅     | ❌         | ❌               |
| **Backups**            | ✅     | ✅       | ❌         | ❌               |
| **Branching**          | ✅✅✅ | ❌       | ❌         | ❌               |
| **Costo**              | Gratis | Gratis   | Gratis     | Gratis           |

## Arquitectura de Base de Datos por Entorno

```
┌─────────────────┐
│   DESARROLLO    │
│     Neon        │ ← Cloud, Branching, Serverless
│  (Development)  │
└─────────────────┘
         │
         │ git push origin qa
         ▼
┌─────────────────┐
│      QA         │
│  Droplet QA     │ ← Self-hosted (Digital Ocean)
│  (Testing)      │
└─────────────────┘
         │
         │ git push origin master
         ▼
┌─────────────────┐
│   PRODUCCIÓN    │
│  Droplet Prod   │ ← Self-hosted (Digital Ocean)
│  (Production)   │
└─────────────────┘
```

**Ventajas de esta arquitectura:**

- ✅ Desarrollo completamente aislado (no ensucia QA/Prod)
- ✅ QA y Prod controlados por ti (self-hosted)
- ✅ Desarrollo con features avanzadas (branching)
- ✅ Sin costos en desarrollo (Neon free tier)

## Flujo de Trabajo Recomendado

### Desarrollo Diario

1. **Usar Neon** para desarrollo normal
2. **Crear branches** para features que requieren cambios de BD
3. **Datos de prueba** en Neon (main branch o feature branches)
4. **Migraciones** se aplican a Neon
5. **Commitear** cambios cuando estén listos

### Debugging con Datos Reales

1. **Usar SSH Tunnel** cuando necesites datos reales de QA
2. **Conectar** a QA temporalmente
3. **Desconectar** cuando termines
4. **NUNCA** usar QA/Prod para desarrollo

### Trabajo con Features Complejas

1. **Crear branch en Neon** para la feature
2. **Desarrollar y probar** en el branch
3. **Si funciona**: Merge al main branch
4. **Si falla**: Eliminar branch (sin consecuencias)
5. **Migraciones** se prueban primero en el branch

### Trabajo Offline

1. **Usar PostgreSQL Local** cuando no tengas internet
2. **Sincronizar** cambios cuando vuelvas a tener conexión
3. **Aplicar migraciones** a Neon cuando vuelvas online

## Troubleshooting

### Neon Connection Failed

```bash
# Verificar URL de conexión
echo $DATABASE_URL

# Probar conexión directa
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Verificar que el proyecto esté activo en Neon Dashboard
# Verificar que el branch existe (si usas branching)
```

### Supabase Connection Failed (si usas Supabase)

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

# Ver datos en Neon Dashboard
# Ir a Tables en el dashboard

# O usar Prisma Studio
npm run prisma:studio

# Ver logs de PostgreSQL local
tail -f /usr/local/var/log/postgres.log  # macOS
tail -f /var/log/postgresql/postgresql-*.log  # Linux

# Backup de base de datos local
pg_dump financieramente_dev > backup.sql

# Restaurar backup
psql financieramente_dev < backup.sql
```
