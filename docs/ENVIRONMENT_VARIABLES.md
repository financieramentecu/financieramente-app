# Variables de Entorno - Guía Completa

Esta guía explica cómo obtener y configurar todas las variables de entorno necesarias para el sistema Financieramente.

## Digital Ocean Token

### Obtener el Token

1. **Ir a Digital Ocean**:
   - URL: https://cloud.digitalocean.com/account/api/tokens
   - Login con tu cuenta

2. **Generar Nuevo Token**:
   - Click en "Generate New Token"
   - **Token Name**: `terraform-financieramente-app`
   - **Expiration**: No Expiration (o según preferencia)
   - **Scopes**: Seleccionar **Read and Write** (full access)

3. **Copiar el Token**:
   - ⚠️ **IMPORTANTE**: Solo se muestra una vez
   - Formato: `dop_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Guardarlo en un gestor de contraseñas

### Scopes Específicos del Token

El token necesita estos permisos:

```
✅ droplet:create      - Crear Droplets
✅ droplet:read        - Leer información de Droplets
✅ droplet:update      - Modificar Droplets
✅ droplet:delete      - Eliminar Droplets
✅ ssh_key:create      - Crear SSH keys
✅ ssh_key:read        - Leer SSH keys
✅ firewall:create     - Crear firewalls
✅ firewall:read       - Leer firewalls
✅ firewall:update     - Modificar firewalls
✅ tag:create          - Crear tags
✅ tag:read            - Leer tags
✅ account:read        - Leer información de cuenta
```

### Configurar el Token

#### En tu máquina local (para Terraform):

**Opción A: Variable de entorno**
```bash
export DIGITALOCEAN_TOKEN="dop_v1_tu_token_aqui"
```

**Opción B: Archivo terraform.tfvars**
```hcl
digitalocean_token = "dop_v1_tu_token_aqui"
```

#### En GitHub Secrets:
- Repository → Settings → Secrets and variables → Actions
- New repository secret
- Name: `DIGITALOCEAN_TOKEN`
- Value: `dop_v1_tu_token_aqui`

## SSH Keys

### Generar SSH Keys para Droplets

```bash
# Generar nueva llave SSH específica para Droplets
ssh-keygen -t ed25519 -C "github-actions-droplets" -f ~/.ssh/droplet_deploy

# Cuando te pregunte por passphrase, presiona Enter (sin passphrase para GitHub Actions)
```

### Configurar SSH Keys

#### Llave Privada (para GitHub Secrets):
```bash
# Ver el contenido completo
cat ~/.ssh/droplet_deploy

# Copiar TODO el contenido, incluyendo:
-----BEGIN OPENSSH PRIVATE KEY-----
[múltiples líneas de contenido]
-----END OPENSSH PRIVATE KEY-----
```

- **Dónde**: GitHub Secrets → `SSH_PRIVATE_KEY`
- **Para qué**: GitHub Actions la usa para conectarse por SSH a los Droplets

#### Llave Pública (para GitHub Secrets y Terraform):
```bash
# Ver el contenido
cat ~/.ssh/droplet_deploy.pub

# Ejemplo de salida:
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIxxxxxxxxxxxxxxxxxxxxx github-actions-droplets
```

- **Dónde 1**: GitHub Secrets → `SSH_PUBLIC_KEY`
- **Dónde 2**: También se usa en Terraform (desde el archivo `terraform.tfvars`)
- **Para qué**: Se instala en los Droplets para autorizar conexiones SSH

## PostgreSQL

### Generar Contraseñas Seguras

```bash
# Contraseña para QA
openssl rand -base64 32

# Contraseña para Producción (ejecutar de nuevo)
openssl rand -base64 32
```

### Variables de PostgreSQL

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_USER` | Usuario de base de datos | `financieramente_user` |
| `POSTGRES_PASSWORD` | Contraseña segura | `8xK9mP2nQ5vR7sT1uW3yZ6aB4cD0eF8gH` |
| `POSTGRES_DB` | Nombre de base de datos | `financieramente_qa` / `financieramente_prod` |
| `DATABASE_URL` | URL completa de conexión | `postgresql://user:password@postgres:5432/dbname` |

### Configurar en GitHub Secrets

```
POSTGRES_PASSWORD_QA    → Primera contraseña generada
POSTGRES_PASSWORD_PROD  → Segunda contraseña generada
```

## Next.js

### Variables de la Aplicación

| Variable | Descripción | Ejemplo | Cuándo se necesita |
|----------|-------------|---------|-------------------|
| `NODE_ENV` | Ambiente de Node.js | `production` (prod) o `qa` (qa) | Build y Runtime |
| `NEXT_PUBLIC_API_URL` | URL pública de la API | `https://negocios.qa.financieramentecu.co` | **Build time** (se incrusta en el código) |
| `DATABASE_URL` | URL de conexión a PostgreSQL | `postgresql://user:pass@postgres:5432/dbname` | Runtime |
| `NEXTAUTH_SECRET` | Secret para NextAuth | Generado con `openssl rand -base64 32` | Runtime |
| `NEXTAUTH_URL` | URL base de la aplicación | `https://negocios.qa.financieramentecu.co` | Runtime |
| `GOOGLE_CLIENT_ID` | Cliente OAuth de Google | `xxx.apps.googleusercontent.com` | Runtime |
| `GOOGLE_CLIENT_SECRET` | Secret del cliente OAuth | Generado por Google | Runtime |
| `NEXT_TELEMETRY_DISABLED` | Deshabilitar telemetría | `1` | Build y Runtime |

### Variables Opcionales

```bash
# Autenticación adicional (si se usa)
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Email/SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# APIs Externas
EXTERNAL_API_KEY=your_api_key_here
```

### Variables de Build Time vs Runtime

**Build Time** (deben estar disponibles durante `npm run build`):
- `NEXT_PUBLIC_API_URL` - Se incrusta en el código compilado
- `NEXT_TELEMETRY_DISABLED` - Configuración de build

**Runtime** (disponibles cuando la aplicación corre):
- `DATABASE_URL` - Conexión a la base de datos
- `NEXTAUTH_SECRET` - Secret para NextAuth
- `NEXTAUTH_URL` - URL base de la aplicación
- `GOOGLE_CLIENT_ID` - Cliente OAuth
- `GOOGLE_CLIENT_SECRET` - Secret OAuth

**Importante**: Las variables `NEXT_PUBLIC_*` se pasan como build args en Docker Compose para que estén disponibles durante el build.

## GitHub Secrets - Lista Completa

### Secrets Requeridos (5 iniciales):

| # | Secret Name | Qué es | Cómo obtenerlo |
|---|-------------|--------|----------------|
| 1 | `DIGITALOCEAN_TOKEN` | Token de API de Digital Ocean | Digital Ocean Dashboard → API |
| 2 | `SSH_PRIVATE_KEY` | Llave SSH privada (completa) | `cat ~/.ssh/droplet_deploy` |
| 3 | `SSH_PUBLIC_KEY` | Llave SSH pública | `cat ~/.ssh/droplet_deploy.pub` |
| 4 | `POSTGRES_PASSWORD_QA` | Contraseña PostgreSQL QA | `openssl rand -base64 32` |
| 5 | `POSTGRES_PASSWORD_PROD` | Contraseña PostgreSQL Prod | `openssl rand -base64 32` |

### Secrets que se agregan después del primer `terraform apply`:

| # | Secret Name | Qué es | Cómo obtenerlo |
|---|-------------|--------|----------------|
| 6 | `QA_DROPLET_IP` | IP pública del Droplet QA | Output de Terraform |
| 7 | `PROD_DROPLET_IP` | IP pública del Droplet Prod | Output de Terraform |

### Secrets de Autenticación (NextAuth y Google OAuth):

**Convención de nombres**: `NOMBRE_VARIABLE_AMBIENTE` (cada ambiente tiene sus propios secrets)

| # | Secret Name | Qué es | Cómo obtenerlo |
|---|-------------|--------|----------------|
| 8 | `NEXTAUTH_SECRET_QA` | Secret para NextAuth en QA | `openssl rand -base64 32` |
| 9 | `NEXTAUTH_SECRET_PROD` | Secret para NextAuth en PROD | `openssl rand -base64 32` |
| 10 | `GOOGLE_CLIENT_ID_QA` | Cliente OAuth de Google para QA | Google Cloud Console (crear cliente OAuth para QA) |
| 11 | `GOOGLE_CLIENT_SECRET_QA` | Secret del cliente OAuth de QA | Google Cloud Console |
| 12 | `GOOGLE_CLIENT_ID_PROD` | Cliente OAuth de Google para PROD | Google Cloud Console (crear cliente OAuth para PROD) |
| 13 | `GOOGLE_CLIENT_SECRET_PROD` | Secret del cliente OAuth de PROD | Google Cloud Console |

**Nota**: Cada ambiente (QA y PROD) tiene su propio cliente OAuth de Google porque los redirect URIs son diferentes:
- QA: `https://negocios.qa.financieramentecu.co/api/auth/callback/google`
- PROD: `https://negocios.financieramentecu.co/api/auth/callback/google`

## Configuración Local

### Archivo terraform.tfvars

```bash
# Crear el archivo (NO se sube a Git por el .gitignore)
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

**Contenido del archivo:**
```hcl
digitalocean_token = "dop_v1_tu_token_aqui"
ssh_public_key = "ssh-ed25519 AAAAC3NzaC1... github-actions-droplets"
postgres_password_qa = "contraseña_qa_generada"
postgres_password_prod = "contraseña_prod_generada"
create_prod_droplet = false  # Solo QA por ahora
```

### Variables de Entorno para Desarrollo Local

#### Opción A: Supabase (Recomendado)

```bash
# .env.local
DATABASE_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

#### Opción B: SSH Tunnel a QA

```bash
# .env.local
DATABASE_URL="postgresql://financieramente_user:PASSWORD@localhost:5433/financieramente_qa"
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Seguridad de Tokens

### ❌ NUNCA hacer esto:
- Compartir tokens en chat/mensaje
- Subir tokens a Git
- Enviar tokens por email
- Guardar tokens en archivos sin encriptar
- Usar tokens en URLs públicas

### ✅ SIEMPRE hacer esto:
- Usar variables de entorno locales
- Guardar tokens en GitHub Secrets (encriptado)
- Usar gestor de contraseñas para almacenar
- Rotar tokens cada 90 días
- Revocar inmediatamente si se compromete

### Archivos a excluir de Git

```bash
# .gitignore
terraform/*.tfvars
terraform/.terraform/
.env
.env.local
.env.*.local
*.log
```

## Checklist de Verificación

Antes de proceder con la implementación, verifica que tienes:

- [ ] Token de Digital Ocean generado y guardado
- [ ] SSH keys generadas (`~/.ssh/droplet_deploy` y `~/.ssh/droplet_deploy.pub`)
- [ ] 5 GitHub Secrets configurados
- [ ] 2 contraseñas PostgreSQL generadas
- [ ] Archivo `terraform.tfvars` creado localmente
- [ ] Rama `qa` existente en GitHub
- [ ] Listo para ejecutar `terraform apply`

## Troubleshooting

### Token no funciona
1. Verificar que el token tenga los scopes correctos
2. Verificar que no haya expirado
3. Generar un nuevo token si es necesario

### SSH connection failed
1. Verificar que la llave privada esté en GitHub Secrets
2. Verificar que la llave pública esté en Terraform
3. Verificar permisos del archivo SSH (`chmod 600`)

### Database connection failed
1. Verificar contraseñas en GitHub Secrets
2. Verificar que las migraciones se ejecutaron
3. Verificar que PostgreSQL esté corriendo

## Comandos Útiles

```bash
# Generar contraseña segura
openssl rand -base64 32

# Ver SSH key pública
cat ~/.ssh/droplet_deploy.pub

# Ver SSH key privada
cat ~/.ssh/droplet_deploy

# Verificar GitHub Secrets
# (Ir a GitHub → Settings → Secrets)

# Verificar variables locales
cat terraform/terraform.tfvars
```
