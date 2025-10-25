# Prisma Migrations - Guía Completa

Esta guía explica cómo manejar las migraciones de Prisma en el sistema Financieramente, desde desarrollo local hasta producción.

## Conceptos Básicos

### ¿Qué son las Migraciones?

Las migraciones son archivos SQL que describen los cambios en la estructura de la base de datos. Prisma genera estos archivos automáticamente basándose en cambios en tu `schema.prisma`.

### Comandos de Prisma

| Comando | Dónde se usa | Qué hace |
|---------|--------------|----------|
| `prisma migrate dev` | **Desarrollo local** | Crea migración + aplica a DB local + genera client |
| `prisma migrate deploy` | **QA/Producción** | Aplica migraciones pendientes (idempotente, seguro) |
| `prisma generate` | **Todos** | Genera/actualiza el Prisma Client basado en schema |
| `prisma migrate reset` | **Solo desarrollo** | ❌ NUNCA en producción - borra TODO y recrea |

## Flujo de Trabajo Completo

### 1. Desarrollo Local

#### Crear/Modificar Schema

```prisma
// prisma/schema.prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String
  createdAt DateTime @default(now())
}
```

#### Crear Migración

```bash
# Crear migración (genera SQL y actualiza tu DB local)
npx prisma migrate dev --name agregar_tabla_usuarios

# Esto hace 3 cosas:
# 1. Genera archivos SQL en prisma/migrations/
# 2. Aplica la migración a tu DB local
# 3. Regenera el Prisma Client
```

#### Commitear Cambios

```bash
# Commitea los archivos de migración
git add prisma/migrations/
git add prisma/schema.prisma
git commit -m "feat: agregar tabla de usuarios"
```

### 2. QA (Automático vía GitHub Actions)

Cuando haces `git push origin qa`:

```mermaid
sequenceDiagram
    participant Dev as Tu Máquina
    participant GitHub as GitHub Repo
    participant Action as GitHub Action
    participant Droplet as Droplet QA
    participant DB as PostgreSQL QA

    Dev->>GitHub: git push origin qa<br/>(incluye prisma/migrations/)
    GitHub->>Action: Trigger workflow
    Action->>Action: npm ci<br/>(instalar dependencias)
    Action->>Action: npx prisma generate<br/>(generar Prisma Client)
    Action->>Action: npm run build<br/>(build Next.js)
    Action->>Droplet: SSH + Deploy código
    Action->>Droplet: npx prisma migrate deploy
    Droplet->>DB: Ejecutar migraciones SQL<br/>(solo las pendientes)
    DB-->>Droplet: ✅ Migraciones aplicadas
    Action->>Droplet: docker compose restart
    Droplet-->>Action: ✅ Deployment exitoso
```

**Comandos que ejecuta GitHub Action**:
```bash
# En el Droplet de QA:
npx prisma migrate deploy  # Aplica SOLO migraciones pendientes
docker-compose restart     # Reinicia la app con el nuevo código
```

### 3. Producción (Automático vía GitHub Actions)

Mismo flujo que QA, pero cuando haces `git push origin master`.

## Estructura de Archivos de Migraciones

```
/prisma/
  ├── schema.prisma                           # Tu esquema de base de datos
  └── migrations/
      ├── 20250123_init/
      │   └── migration.sql                   # Primera migración
      ├── 20250124_agregar_tabla_usuarios/
      │   └── migration.sql                   # Segunda migración
      └── migration_lock.toml                 # Lock file (subir a Git)
```

**IMPORTANTE**: Todos estos archivos se suben a Git y se despliegan automáticamente.

## Casos Especiales

### Caso 1: Primera vez creando DB en QA

Cuando el Droplet de QA se crea por primera vez:

```bash
# GitHub Action ejecuta:
npx prisma migrate deploy

# Si la DB está vacía, Prisma:
# 1. Crea las tablas de migración (_prisma_migrations)
# 2. Ejecuta TODAS las migraciones en orden
# 3. Marca cada una como aplicada
```

### Caso 2: Ya existe DB en QA y agregas nueva migración

```bash
# GitHub Action ejecuta:
npx prisma migrate deploy

# Prisma:
# 1. Verifica qué migraciones ya están aplicadas
# 2. Ejecuta SOLO las nuevas (las que no están en _prisma_migrations)
# 3. Es idempotente (puedes ejecutarlo múltiples veces sin problema)
```

### Caso 3: Necesitas hacer rollback

```bash
# Opción A: Crear una migración que revierta cambios
npx prisma migrate dev --name revertir_cambio_usuarios

# En la migración, escribes SQL manual para revertir:
# DROP TABLE usuarios;

# Opción B: Restaurar backup de base de datos (en producción)
```

## Ejemplo Completo Paso a Paso

### Día 1: Crear primera migración

```bash
# En tu máquina local
cd /Volumes/JohnAgudelo/Projects/financieramente-app

# 1. Editar schema
# prisma/schema.prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String
}

# 2. Crear migración
npx prisma migrate dev --name init

# 3. Commitear
git add .
git commit -m "feat: schema inicial con tabla users"
git push origin qa

# 4. GitHub Action automáticamente:
#    - Despliega código a Droplet QA
#    - Ejecuta: npx prisma migrate deploy
#    - Crea tabla 'User' en PostgreSQL QA
```

### Día 5: Agregar nueva tabla

```bash
# 1. Editar schema
model Post {
  id       Int    @id @default(autoincrement())
  title    String
  content  String
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
}

# 2. Crear migración
npx prisma migrate dev --name agregar_posts

# 3. Commitear
git add .
git commit -m "feat: agregar tabla posts"
git push origin qa

# 4. GitHub Action automáticamente:
#    - Ejecuta: npx prisma migrate deploy
#    - Solo aplica la NUEVA migración (agregar_posts)
#    - La tabla User NO se toca (ya existe)
```

## Configuración de Prisma

### Schema Básico

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
}
```

### Variables de Entorno

```bash
# .env.local (desarrollo)
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"

# .env (QA/Producción)
DATABASE_URL="postgresql://financieramente_user:PASSWORD@postgres:5432/financieramente_qa"
```

## Comandos Útiles

### Desarrollo Local

```bash
# Crear migración
npx prisma migrate dev --name nombre_migracion

# Resetear base de datos (CUIDADO: borra todos los datos)
npx prisma migrate reset

# Generar Prisma Client
npx prisma generate

# Ver estado de migraciones
npx prisma migrate status

# Aplicar migraciones pendientes
npx prisma migrate deploy
```

### En Servidores (QA/Producción)

```bash
# Solo aplicar migraciones (NO crear nuevas)
npx prisma migrate deploy

# Ver estado de migraciones
npx prisma migrate status

# Generar Prisma Client
npx prisma generate
```

### Debugging

```bash
# Ver SQL que se ejecutaría
npx prisma migrate deploy --dry-run

# Ver historial de migraciones
npx prisma migrate status

# Conectar a base de datos
npx prisma db pull

# Ver datos
npx prisma studio
```

## Troubleshooting

### Error: Migration not found

```bash
# Verificar que los archivos de migración estén en Git
git status prisma/migrations/

# Si faltan archivos, restaurarlos desde Git
git checkout HEAD -- prisma/migrations/
```

### Error: Database connection failed

```bash
# Verificar variables de entorno
echo $DATABASE_URL

# Probar conexión
npx prisma db pull

# Verificar que PostgreSQL esté corriendo
docker-compose ps postgres
```

### Error: Migration already applied

```bash
# Ver estado de migraciones
npx prisma migrate status

# Si hay inconsistencias, resolver manualmente
npx prisma migrate resolve --applied nombre_migracion
```

### Error: Schema drift

```bash
# Ver diferencias entre schema y base de datos
npx prisma db pull

# Si hay diferencias, crear nueva migración
npx prisma migrate dev --name fix_schema_drift
```

## Mejores Prácticas

### 1. Nombres de Migraciones Descriptivos

```bash
# ✅ Buenos nombres
npx prisma migrate dev --name add_user_table
npx prisma migrate dev --name add_email_index_to_users
npx prisma migrate dev --name remove_deprecated_fields

# ❌ Nombres malos
npx prisma migrate dev --name update
npx prisma migrate dev --name fix
npx prisma migrate dev --name changes
```

### 2. Siempre Probar Migraciones

```bash
# 1. Crear migración en desarrollo
npx prisma migrate dev --name nueva_funcionalidad

# 2. Probar localmente
npm run dev

# 3. Commitear y hacer push a QA
git add . && git commit -m "feat: nueva funcionalidad"
git push origin qa

# 4. Verificar que funciona en QA
# 5. Solo entonces hacer push a master
```

### 3. Backup Antes de Migraciones Importantes

```bash
# En producción, hacer backup antes de migraciones grandes
ssh root@[PROD_IP] "cd /opt/financieramente && docker-compose exec postgres pg_dump -U financieramente_user financieramente_prod > backup_$(date +%Y%m%d).sql"
```

### 4. Migraciones Atómicas

- Una migración = un cambio lógico
- No mezclar cambios no relacionados
- Cada migración debe ser reversible

## Comandos de Emergencia

### Rollback Manual

```bash
# 1. Hacer backup
pg_dump database_name > backup.sql

# 2. Restaurar backup anterior
psql database_name < backup_anterior.sql

# 3. Marcar migración como revertida
npx prisma migrate resolve --rolled-back nombre_migracion
```

### Reset Completo (Solo Desarrollo)

```bash
# ⚠️ CUIDADO: Esto borra TODOS los datos
npx prisma migrate reset

# Esto hace:
# 1. Borra la base de datos
# 2. Recrea la base de datos
# 3. Aplica todas las migraciones desde cero
# 4. Ejecuta seed si existe
```

## Integración con GitHub Actions

Las migraciones se ejecutan automáticamente en los workflows:

```yaml
# .github/workflows/deploy-qa.yml
- name: Run database migrations
  run: |
    ssh root@${{ secrets.QA_DROPLET_IP }} << 'EOF'
    cd /opt/financieramente/app
    npx prisma migrate deploy
    EOF
```

Esto garantiza que:
- ✅ Las migraciones se ejecuten en el orden correcto
- ✅ Solo se apliquen migraciones pendientes
- ✅ El proceso sea idempotente y seguro
- ✅ Se manejen errores automáticamente
