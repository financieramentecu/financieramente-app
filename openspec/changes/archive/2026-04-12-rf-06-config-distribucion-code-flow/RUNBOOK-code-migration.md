# Runbook: `product_configuration.code` backfill (RF-07)

Run **before** applying migration `20260412190000_product_configuration_code_not_null_unique` on production if you need a manual check.

## Audit queries (PostgreSQL)

```sql
-- Null or empty codes
SELECT id_product_configuration, id_product, id_client_origin, id_category
FROM product_configuration
WHERE code IS NULL OR TRIM(code) = '';

-- Duplicate codes (before unique index)
SELECT code, COUNT(*) FROM product_configuration GROUP BY code HAVING COUNT(*) > 1;
```

## Apply

1. Backup DB.
2. Run `npx prisma migrate deploy` (or `migrate dev` locally).
3. If migration fails on duplicates, resolve rows manually then re-run.

## Error P3006 / P1014 (shadow database)

`prisma migrate dev` replays **all** migrations on a temporary **shadow** database. If that step fails with *“failed to apply cleanly to the shadow database”* and P1014 *(table/model `(not available)`)*:

1. **Apply this migration without shadow** (recommended for CI / Neon when the SQL file is already in the repo):
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```
   `migrate deploy` does **not** use a shadow DB; it only applies pending migrations to `DATABASE_URL`.

2. **Connection strings (Neon / pooler)**  
   Use a **direct** (non-pooled) URL for migrations: set `DIRECT_URL` in `schema.prisma` to the same value Prisma expects (see `docs/DATABASE_CONNECTION.md`). Pooled `?pgbouncer=true` URLs often break `migrate dev`.

3. **If you must use `migrate dev`** (e.g. to create *new* migrations later), configure a dedicated shadow database Prisma can write to (second database in Neon, or local Postgres), then add to `schema.prisma`:
   ```prisma
   datasource db {
     provider          = "postgresql"
     url               = env("DATABASE_URL")
     directUrl         = env("DIRECT_URL")
     shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
   }
   ```
   and set `SHADOW_DATABASE_URL` in `.env.local` to that second database.

4. After changing the migration SQL file, if the migration was **never** applied successfully anywhere, no extra steps. If it was **partially** applied, you need DBA recovery (restore backup or fix `_prisma_migrations`); do not re-run the same version blindly on a dirty DB.

## Error P3009 (migración fallida registrada en la BD)

No tiene que ver con URLs: Prisma encontró en `_prisma_migrations` una migración en estado **failed** (p. ej. `20260412190000_product_configuration_code_not_null_unique` tras un intento anterior) y **no aplica** nuevas migraciones hasta resolverlo.

**Si el fallo fue con transacción revertida** (típico en PostgreSQL: no quedaron `NOT NULL` ni índice único aplicados):

```bash
npx prisma migrate resolve --rolled-back "20260412190000_product_configuration_code_not_null_unique"
npx prisma migrate deploy
npx prisma generate
```

Eso marca la migración como revertida en el historial de Prisma y permite **volver a ejecutarla** con el SQL corregido del repo.

**Si sospechas que parte del SQL sí se aplicó** (poco habitual si todo el archivo va en una sola transacción), revisa en Neon:

- ¿Existe el índice único `product_configuration_code_key`?
- ¿La columna `code` ya es `NOT NULL`?

Si hay cambios a medias, corrige la BD a mano o restaura backup **antes** de usar `resolve` + `deploy`.

Documentación: https://www.prisma.io/docs/guides/migrate/production-troubleshooting
