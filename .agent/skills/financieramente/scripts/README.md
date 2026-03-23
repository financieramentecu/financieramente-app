# Referencia: scripts del proyecto

Los scripts están en la **raíz del repo**: `scripts/` (y `terraform/scripts/`).

Ejecutar desde la raíz: `./scripts/<nombre>` o `npx tsx scripts/<nombre>.ts`.

## Shell (scripts/)

| Script | Uso |
|--------|-----|
| `infrastructure.sh` | Terraform: init, plan, apply, status, connect-qa |
| `db-tunnel-qa.sh` | Túnel SSH a Postgres QA: start, test, stop |
| `droplet-status.sh` | Estado de droplets |
| `maintenance-qa.sh` | Mantenimiento QA |
| `ssh-diagnostic.sh` | Diagnóstico SSH |

## TypeScript (scripts/)

| Script | Cómo ejecutar | Uso |
|--------|----------------|-----|
| `list-admin-users.ts` | `npx tsx scripts/list-admin-users.ts` | Listar usuarios admin |
| `set-admin-password.ts` | `npx tsx scripts/set-admin-password.ts` | Establecer contraseña admin |
| `test-email.ts` | `npm run test:email` | Probar envío de email |

## Terraform (terraform/scripts/)

| Script | Uso |
|--------|-----|
| `deploy-app.sh` | Desplegar aplicación |
| `setup-droplet.sh` | Configurar droplet |
| `setup-ssl.sh` | Configurar SSL |
| `ssl-renew.sh` | Renovar certificados |
| `update-fail2ban.sh` | Actualizar fail2ban |
| `diagnostic.sh` | Diagnóstico |

Resumen de comandos npm y uso de estos scripts: [SKILL.md](../SKILL.md#scripts-relevantes).
