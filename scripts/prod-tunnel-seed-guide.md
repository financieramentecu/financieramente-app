# Guia: Tunel a Produccion + Seed desde local

Esta guia explica como conectarte a la base de datos de produccion por tunel
SSH desde tu equipo local y ejecutar el seed de forma segura.

## Prerrequisitos

- Estar en la raiz del proyecto.
- Tener la llave SSH en `~/.ssh/droplet_deploy`.
- Tener el script de tunel de prod:
	- `scripts/db-tunnel-prod.sh`
- Tener `node_modules` instalados (`npm install`) para poder correr `tsx`.
- Tener la password real de PostgreSQL de produccion.

## 1) Levantar tunel a produccion

Puedes usar IP automatica (terraform/archivo) o pasarla manualmente.

### Opcion A: Automatica

```bash
./scripts/db-tunnel-prod.sh start
```

### Opcion B: Manual con IP explicita

```bash
PROD_DROPLET_IP=1.2.3.4 ./scripts/db-tunnel-prod.sh start
```

## 2) Verificar estado del tunel

```bash
./scripts/db-tunnel-prod.sh status
```

Validacion adicional del puerto local:

```bash
lsof -nP -iTCP:5434 -sTCP:LISTEN
```

> El tunel de prod en este proyecto usa `localhost:5434`.

## 3) Ejecutar seed de produccion desde tu equipo local

Ejecuta el seed apuntando `DATABASE_URL` al puerto del tunel:

```bash
DATABASE_URL='postgresql://financieramente_user:TU_PASSWORD@localhost:5434/financieramente_prod' \
npx tsx prisma/seed.ts
```

Alternativa con script npm:

```bash
DATABASE_URL='postgresql://financieramente_user:TU_PASSWORD@localhost:5434/financieramente_prod' \
npm run prisma:seed
```

## 4) Cerrar tunel cuando termines

```bash
./scripts/db-tunnel-prod.sh stop
```

## Troubleshooting rapido

### Error: `Port 5434 is already in use`

```bash
lsof -nP -iTCP:5434 -sTCP:LISTEN
kill <PID>
./scripts/db-tunnel-prod.sh start
```

### Error de autenticacion SSH

- Verifica que exista `~/.ssh/droplet_deploy`.
- Verifica permisos de la llave:

```bash
chmod 600 ~/.ssh/droplet_deploy
```

### Error de login a PostgreSQL

- Revisa usuario, password y nombre de base:
	- Usuario: `financieramente_user`
	- Base: `financieramente_prod`
	- Host: `localhost`
	- Puerto: `5434`

## Notas de seguridad

- Este flujo impacta datos reales de produccion.
- No ejecutes `prisma/seed-test-data.ts` en produccion.
- Haz backup si vas a correr cambios de datos sensibles.
