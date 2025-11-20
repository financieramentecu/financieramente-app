# Cómo Hacer Cambios al Modelo de Prisma

Esta guía explica el proceso completo para modificar el schema de Prisma y aplicar los cambios a la base de datos.

## Flujo de Trabajo para Modificar el Schema

### Paso 1: Modificar el Schema

Edita el archivo `prisma/schema.prisma` con los cambios que necesitas:

```prisma
// Ejemplo: Agregar un nuevo campo a User
model User {
  idUser         Int       @id @default(autoincrement()) @map("id_user")
  name           String    @db.VarChar(150)
  lastName       String?   @map("last_name") @db.VarChar(150)
  // ... campos existentes ...

  // ✅ NUEVO CAMPO
  avatar         String?   @db.VarChar(255)  // Campo nuevo
  phoneNumber    String?   @map("phone_number") @db.VarChar(30)  // Otro campo nuevo

  // ... resto del modelo ...
}
```

### Paso 2: Crear la Migración

Ejecuta el comando para crear la migración:

```bash
npm run prisma:migrate:dev --name agregar_campos_avatar_y_telefono
```

Este comando hace 3 cosas automáticamente:

1. **Genera el archivo SQL** en `prisma/migrations/[timestamp]_agregar_campos_avatar_y_telefono/migration.sql`
2. **Aplica la migración** a tu base de datos local (Supabase en desarrollo)
3. **Regenera el Prisma Client** con los nuevos tipos TypeScript

### Paso 3: Revisar la Migración Generada

Prisma genera el SQL automáticamente. Revisa el archivo generado:

```sql
-- prisma/migrations/20250123_agregar_campos_avatar_y_telefono/migration.sql

-- AlterTable
ALTER TABLE "user" ADD COLUMN "avatar" VARCHAR(255),
                    ADD COLUMN "phone_number" VARCHAR(30);
```

**IMPORTANTE**: Si necesitas hacer cambios manuales al SQL (por ejemplo, valores por defecto, índices especiales), puedes editar este archivo antes de aplicar la migración.

### Paso 4: Commitear los Cambios

Una vez que la migración se aplicó correctamente en desarrollo:

```bash
# Agregar archivos de migración y schema
git add prisma/schema.prisma
git add prisma/migrations/

# Commitear
git commit -m "feat: agregar campos avatar y phoneNumber a User"

# Push a QA para probar
git push origin qa
```

### Paso 5: Aplicación Automática en QA/Producción

Los cambios se aplican automáticamente cuando haces push:

- **QA**: Al hacer `git push origin qa`, GitHub Actions ejecuta `npx prisma migrate deploy`
- **Producción**: Al hacer `git push origin master`, GitHub Actions ejecuta `npx prisma migrate deploy`

## Ejemplos Comunes de Cambios

### Ejemplo 1: Agregar un Nuevo Campo

```prisma
// Antes
model Business {
  idBusiness Int @id @default(autoincrement())
  value      Decimal @db.Decimal(15, 2)
  // ...
}

// Después
model Business {
  idBusiness Int @id @default(autoincrement())
  value      Decimal @db.Decimal(15, 2)
  discount   Decimal? @db.Decimal(15, 2)  // ✅ Campo nuevo opcional
  // ...
}
```

```bash
npm run prisma:migrate:dev --name agregar_campo_discount_business
```

### Ejemplo 2: Modificar Tipo de Dato

```prisma
// Antes
model User {
  phone String? @db.VarChar(30)
}

// Después - Cambiar longitud
model User {
  phone String? @db.VarChar(50)  // ✅ De 30 a 50 caracteres
}
```

```bash
npm run prisma:migrate:dev --name aumentar_longitud_telefono_usuario
```

**⚠️ CUIDADO**: Cambiar tipos de datos puede causar pérdida de datos. Prisma te advertirá si hay datos incompatibles.

### Ejemplo 3: Agregar Relación

```prisma
// Antes
model Business {
  idBusiness Int @id
  // ...
}

model Payment {
  idPayment Int @id
  // ...
}

// Después - Agregar relación
model Business {
  idBusiness Int @id
  payments   Payment[]  // ✅ Nueva relación
  // ...
}

model Payment {
  idPayment   Int @id
  idBusiness  Int @map("id_business")
  business    Business @relation(fields: [idBusiness], references: [idBusiness])  // ✅ Nueva relación
  // ...
}
```

```bash
npm run prisma:migrate:dev --name agregar_relacion_business_payment
```

### Ejemplo 4: Agregar Índice

```prisma
// Antes
model User {
  email String? @db.VarChar(150)
  // ...
}

// Después
model User {
  email String? @db.VarChar(150)
  // ...

  @@index([email])  // ✅ Nuevo índice
}
```

```bash
npm run prisma:migrate:dev --name agregar_indice_email_usuario
```

### Ejemplo 5: Agregar Constraint Único

```prisma
// Antes
model Client {
  identityNumber String @map("identity_number") @db.VarChar(20)
  // ...
}

// Después
model Client {
  identityNumber String @map("identity_number") @db.VarChar(20)
  // ...

  @@unique([identityNumber])  // ✅ Constraint único
}
```

```bash
npm run prisma:migrate:dev --name agregar_unique_identity_number_client
```

### Ejemplo 6: Eliminar Campo (con Cuidado)

```prisma
// Antes
model User {
  oldField String?  // Campo a eliminar
  // ...
}

// Después
model User {
  // oldField eliminado
  // ...
}
```

```bash
npm run prisma:migrate:dev --name eliminar_campo_old_field
```

**⚠️ ADVERTENCIA**: Eliminar campos borra los datos permanentemente. Considera:

- Hacer backup antes
- Migrar datos importantes a otro campo primero
- Usar un período de deprecación antes de eliminar

### Ejemplo 7: Renombrar Campo

```prisma
// Antes
model User {
  phoneNumber String? @map("phone_number")
}

// Después
model User {
  phone String? @map("phone")  // ✅ Renombrado
}
```

**IMPORTANTE**: Prisma no renombra automáticamente. Necesitas hacerlo manualmente:

1. **Opción A**: Crear migración manual

   ```bash
   npm run prisma:migrate:dev --name renombrar_phone_number_a_phone --create-only
   ```

   Luego editar el SQL generado:

   ```sql
   ALTER TABLE "user" RENAME COLUMN "phone_number" TO "phone";
   ```

2. **Opción B**: Cambiar el nombre del campo en Prisma y el mapeo
   ```prisma
   // Cambiar solo el nombre del campo TypeScript, mantener el nombre de BD
   phone String? @map("phone_number")  // Campo TypeScript: phone, BD: phone_number
   ```

## Comandos Útiles

### Crear Migración sin Aplicarla

```bash
npm run prisma:migrate:dev --name nombre_migracion --create-only
```

Útil cuando quieres revisar o modificar el SQL antes de aplicarlo.

### Ver Estado de Migraciones

```bash
npx prisma migrate status
```

Muestra qué migraciones están aplicadas y cuáles están pendientes.

### Aplicar Migraciones Pendientes (Producción)

```bash
npm run prisma:migrate:deploy
```

Este comando SOLO aplica migraciones pendientes, no crea nuevas. Se usa en QA/Producción.

### Resetear Base de Datos (Solo Desarrollo)

```bash
npx prisma migrate reset
```

**⚠️ CUIDADO**: Esto borra TODOS los datos y vuelve a aplicar todas las migraciones desde cero. Solo usar en desarrollo.

### Ver Diferencias entre Schema y BD

```bash
npx prisma db pull
```

Compara tu schema con la estructura actual de la base de datos y muestra diferencias.

## Mejores Prácticas

### 1. Nombres Descriptivos

```bash
# ✅ Buenos nombres
npm run prisma:migrate:dev --name agregar_campo_email_a_usuario
npm run prisma:migrate:dev --name crear_tabla_payments
npm run prisma:migrate:dev --name agregar_indice_email_usuario

# ❌ Nombres malos
npm run prisma:migrate:dev --name update
npm run prisma:migrate:dev --name fix
npm run prisma:migrate:dev --name cambios
```

### 2. Una Migración = Un Cambio Lógico

```bash
# ✅ Correcto - Una migración por cambio
npm run prisma:migrate:dev --name agregar_campo_avatar
npm run prisma:migrate:dev --name agregar_campo_telefono

# ❌ Incorrecto - Muchos cambios no relacionados en una migración
npm run prisma:migrate:dev --name agregar_varios_campos_y_tablas
```

### 3. Probar en Desarrollo Primero

```bash
# 1. Crear migración en desarrollo
npm run prisma:migrate:dev --name nuevo_campo

# 2. Probar localmente
npm run dev

# 3. Si funciona, commitear y push a QA
git add prisma/
git commit -m "feat: agregar nuevo campo"
git push origin qa

# 4. Verificar en QA antes de producción
# 5. Solo entonces push a master
```

### 4. Backup Antes de Cambios Importantes

```bash
# En producción, hacer backup antes de migraciones grandes
ssh root@[PROD_IP] "cd /opt/financieramente && docker-compose exec postgres pg_dump -U financieramente_user financieramente_prod > backup_$(date +%Y%m%d).sql"
```

### 5. Migraciones Atómicas

Cada migración debe ser independiente y poder ejecutarse en cualquier orden. Evita dependencias entre migraciones.

## Flujo Completo de Ejemplo

```bash
# 1. Editar schema.prisma
# Agregar campo "notes" a Business

# 2. Crear migración
npm run prisma:migrate:dev --name agregar_campo_notes_business

# 3. Verificar que se aplicó correctamente
npx prisma studio  # Abrir Prisma Studio para ver los cambios

# 4. Probar en código
# Actualizar tu código para usar el nuevo campo

# 5. Commitear
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: agregar campo notes a Business"

# 6. Push a QA
git push origin qa

# 7. GitHub Actions aplica automáticamente la migración en QA

# 8. Verificar en QA que funciona

# 9. Push a producción
git push origin master
```

## Troubleshooting

### Error: Migration Already Applied

```bash
# Ver estado
npx prisma migrate status

# Si hay inconsistencias, marcar como aplicada manualmente
npx prisma migrate resolve --applied nombre_migracion
```

### Error: Schema Drift

```bash
# Ver diferencias
npx prisma db pull

# Si hay diferencias, crear migración para sincronizar
npm run prisma:migrate:dev --name fix_schema_drift
```

### Error: Cannot Apply Migration

```bash
# Ver logs detallados
npx prisma migrate deploy --verbose

# Si es necesario, hacer rollback manual restauración de backup
```

## Recursos Adicionales

- `docs/PRISMA_MIGRATIONS.md` - Guía completa de migraciones
- `docs/PRISMA_USAGE.md` - Guía de uso del cliente Prisma
- [Prisma Migrations Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
