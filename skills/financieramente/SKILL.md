---
name: financieramente
description: >
  Project overview for Financieramente (commission settlement platform). Describes structure, architecture, how to run, relevant scripts, and which skills to use for each task. Use when onboarding, navigating the codebase, setting up the environment, running scripts, or deciding which skill to invoke for React/TypeScript/Next.js/commits/reviews.
---

# Financieramente – Project Skill

Sistema de liquidación de comisiones. Next.js 15, React 19, Prisma, PostgreSQL, Docker, Terraform (Digital Ocean).

---

## Estructura del proyecto

```
financieramente-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes (admin, auth, email)
│   │   └── dashboard/          # Páginas del dashboard
│   ├── features/               # Feature-based (cada feature autocontenido)
│   │   ├── admin/             # products, companies, categories, currencies, etc.
│   │   ├── auth/               # login, logout, sesión
│   │   ├── email/              # sendgrid, email service
│   │   ├── negocios/           # negocios / business
│   │   └── shared/             # ui, layout, hooks, providers, types
│   ├── lib/                    # api/client, auth, prisma.ts
│   └── types/                  # env.d.ts
├── prisma/                     # schema, migrations, seed, seeds/
├── docker/                     # Dockerfile, compose (qa/prod), nginx, env.example
├── terraform/                  # Digital Ocean (qa/prod), scripts/
├── docs/                       # Guías (env, DB, Prisma, testing, infra)
├── scripts/                    # Shell + TS (infra, DB tunnel, admin, email)
├── e2e/                        # Playwright E2E
└── skills/                     # Skills del proyecto (typescript, react-19, etc.)
```

Cada feature en `src/features/<feature>/` suele tener: `components/`, `hooks/`, `lib/` (schemas Zod + API), `types/`, `__tests__/`.

---

## Skills relacionados (cuándo usar cada uno)

| Necesitas… | Skill | Ubicación |
|------------|--------|-----------|
| Escribir componentes React | `react-19` | [react-19/SKILL.md](../react-19/SKILL.md) |
| Tipos/interfaces TypeScript | `typescript` | [typescript/SKILL.md](../typescript/SKILL.md) |
| App Router, Server Actions, rutas API | `nextjs-16` | [nextjs-16/SKILL.md](../nextjs-16/SKILL.md) |
| Organizar por dominio/feature | `screaming-architecture` | [screaming-architecture/SKILL.md](../screaming-architecture/SKILL.md) |
| Mensajes de commit | `commit-messages` | [commit-messages/SKILL.md](../commit-messages/SKILL.md) |
| Revisión de código (seguridad, rendimiento) | `code-review-skill` | [code-review-skill/SKILL.md](../code-review-skill/SKILL.md) |

**Auto-invoke** (desde [AGENTS.md](../../AGENTS.md)): React components → `react-19` primero; TypeScript types/interfaces → `typescript` primero.

---

## Arquitectura

- **Feature-based**: código agrupado por funcionalidad, no por tipo técnico.
- **Features autocontenidos**: tipos, schemas Zod, hooks, componentes y tests en la carpeta del feature.
- **Shared**: UI, layout, hooks, providers y tipos comunes en `src/features/shared/`.
- **API**: rutas en `app/api/` que llaman a servicios; sin capas intermedias pesadas.
- **Prisma**: solo en Server Components y API routes; nunca en Client Components.

Reglas de arquitectura y principios (Screaming Architecture, TypeScript) están en [.cursor/rules/ARCHITECTURE.md](../../.cursor/rules/ARCHITECTURE.md).

---

## Cómo ejecutar

### Prerrequisitos

- Node.js 20+
- npm
- (Opcional) Docker, cuenta Supabase o PostgreSQL local

### Setup rápido

```bash
git clone <repo> && cd financieramente-app
npm install
cp docker/env.example .env.local   # o cp .env.example .env.local
# Editar .env.local: DATABASE_URL, AUTH_SECRET (ver abajo)
npx prisma migrate dev --name init   # si usas DB local
npm run dev
```

Abrir `http://localhost:3000`.

### Variables mínimas (evitar 500 por NextAuth)

Crear `.env.local` en la raíz y asegurar al menos:

```env
AUTH_SECRET=<generar con: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

Para Google OAuth (opcional): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Detalle en [SETUP_ENV.md](../../SETUP_ENV.md) y [docs/ENVIRONMENT_VARIABLES.md](../../docs/ENVIRONMENT_VARIABLES.md).

---

## Scripts relevantes

### npm (package.json)

| Comando | Uso |
|--------|-----|
| `npm run dev` | Desarrollo Next.js |
| `npm run build` | Build producción |
| `npm run start` | Servidor producción |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm run test:unit` | Vitest unitarios |
| `npm run test:integration` | Vitest integración |
| `npm run test:e2e` | Playwright E2E |
| `npm run test:all` | unit + integration + e2e |
| `npm run storybook` | Storybook (puerto 6006) |
| `npm run prisma:generate` | Generar cliente Prisma |
| `npm run prisma:migrate:dev` | Migrar en desarrollo |
| `npm run prisma:migrate:deploy` | Migrar en deploy |
| `npm run prisma:studio` | Prisma Studio |
| `npm run prisma:seed` | Ejecutar seed |
| `npm run format` | Prettier write |
| `npm run test:email` | Script de prueba email (tsx scripts/test-email.ts) |

### Scripts en `/scripts` (ejecutar desde raíz del proyecto)

Referencia detallada: [scripts/README.md](scripts/README.md).

| Script | Uso |
|--------|-----|
| `./scripts/infrastructure.sh init` | Terraform init |
| `./scripts/infrastructure.sh plan` | Terraform plan |
| `./scripts/infrastructure.sh apply` | Terraform apply |
| `./scripts/infrastructure.sh status` | Estado infra |
| `./scripts/infrastructure.sh connect-qa` | SSH a QA |
| `./scripts/db-tunnel-qa.sh start` | Túnel SSH a Postgres QA |
| `./scripts/db-tunnel-qa.sh test` | Probar conexión túnel |
| `./scripts/db-tunnel-qa.sh stop` | Detener túnel |
| `./scripts/droplet-status.sh` | Estado droplets |
| `./scripts/maintenance-qa.sh` | Mantenimiento QA |
| `./scripts/ssh-diagnostic.sh` | Diagnóstico SSH |

Scripts TS (con `npx tsx` o según package.json):

- `scripts/list-admin-users.ts` – listar admins
- `scripts/set-admin-password.ts` – fijar contraseña admin
- `scripts/test-email.ts` – prueba de envío email

### Docker

- `docker/Dockerfile` – imagen de la app
- `docker/docker-compose.qa.yml` / `docker-compose.prod.yml` – entornos
- `docker/env.example` – plantilla de variables para contenedores
- `docker/nginx/nginx.conf` – proxy/seguridad

### Terraform

- `terraform/` – droplets QA/Prod, provider, variables, outputs
- `terraform/scripts/` – deploy-app, setup-droplet, SSL, fail2ban, etc.
- Copiar `terraform/terraform.tfvars.example` → `terraform.tfvars` y configurar antes de `terraform apply`

---

## Documentación adicional

| Tema | Archivo |
|------|---------|
| Infraestructura | [docs/INFRASTRUCTURE.md](../../docs/INFRASTRUCTURE.md) |
| Variables de entorno | [docs/ENVIRONMENT_VARIABLES.md](../../docs/ENVIRONMENT_VARIABLES.md) |
| Conexión DB / túneles | [docs/DATABASE_CONNECTION.md](../../docs/DATABASE_CONNECTION.md) |
| Prisma (migraciones, uso) | [docs/PRISMA_MIGRATIONS.md](../../docs/PRISMA_MIGRATIONS.md), [docs/PRISMA_USAGE.md](../../docs/PRISMA_USAGE.md) |
| Testing | [docs/TESTING.md](../../docs/TESTING.md) |
| Workflow desarrollo | [docs/DEVELOPMENT_WORKFLOW.md](../../docs/DEVELOPMENT_WORKFLOW.md) |
| Setup env rápido | [SETUP_ENV.md](../../SETUP_ENV.md) |
| Visión general y convenciones | [README.md](../../README.md) |

---

## Resumen de flujo

1. **Navegar**: `src/features/<feature>/` para dominio; `src/features/shared/` para común.
2. **Escribir código**: React → skill `react-19`; tipos → skill `typescript`; rutas/Server Actions → skill `nextjs-16`; estructura de carpetas → skill `screaming-architecture`.
3. **Ejecutar**: `npm run dev` + `.env.local` con `AUTH_SECRET` y `NEXTAUTH_URL` (y `DATABASE_URL` si aplica).
4. **DB**: Prisma en `prisma/`; migraciones y seed vía scripts npm; túnel QA con `scripts/db-tunnel-qa.sh`.
5. **Infra**: Terraform en `terraform/`; helpers en `scripts/infrastructure.sh`.
