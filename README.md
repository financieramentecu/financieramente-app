# Financieramente - Sistema de Liquidación

Sistema de liquidación desarrollado con Next.js 15, React 19, Prisma ORM y PostgreSQL, desplegado en Digital Ocean con infraestructura como código usando Terraform.

## 🏗️ Arquitectura

- **Frontend**: Next.js 15 con React 19 y Tailwind CSS
- **Backend**: API Routes de Next.js con Prisma ORM
- **Base de Datos**: PostgreSQL 15
- **Proxy**: Nginx con configuración de seguridad
- **Contenedores**: Docker con Docker Compose
- **CI/CD**: GitHub Actions
- **Infraestructura**: Terraform + Digital Ocean

## 🚀 Getting Started

### Desarrollo Local

1. **Clonar el repositorio**:
   ```bash
   git clone <repository-url>
   cd financieramente-app
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar base de datos** (recomendado: Supabase):
   ```bash
   # Crear proyecto en https://supabase.com
   # Copiar connection string a .env.local
   cp docker/env.example .env.local
   # Editar .env.local con tu DATABASE_URL de Supabase
   ```

4. **Ejecutar migraciones**:
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

6. **Abrir en el navegador**:
   ```
   http://localhost:3000
   ```

## 🏭 Infraestructura

### Ambientes

| Ambiente | Droplet | Costo | Recursos | URL |
|----------|---------|-------|----------|-----|
| **QA** | s-1vcpu-1gb | $6/month | 1GB RAM, 1 vCPU | `http://[QA_IP]` |
| **Producción** | s-2vcpu-4gb | $24/month | 4GB RAM, 2 vCPU | `http://[PROD_IP]` |

### Despliegue Automático

- **Push a `qa`** → Despliega automáticamente a QA
- **Push a `master`** → Despliega automáticamente a Producción

## 🛠️ Comandos de Infraestructura

### Configuración Inicial

1. **Configurar variables de entorno**:
   ```bash
   # Copiar template de variables
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   
   # Editar con tus valores
   nano terraform/terraform.tfvars
   ```

2. **Configurar GitHub Secrets**:
   - `DIGITALOCEAN_TOKEN`
   - `SSH_PRIVATE_KEY`
   - `SSH_PUBLIC_KEY`
   - `POSTGRES_PASSWORD_QA`
   - `POSTGRES_PASSWORD_PROD`

3. **Crear infraestructura de QA**:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

4. **Obtener IP de QA y agregar a GitHub Secrets**:
   ```bash
   terraform output qa_droplet_ip
   # Agregar como QA_DROPLET_IP en GitHub Secrets
   ```

### Gestión de Infraestructura

```bash
# Ver estado de infraestructura
./scripts/infrastructure.sh status

# Conectar a QA
./scripts/infrastructure.sh connect-qa

# Ver logs de QA
./scripts/infrastructure.sh logs-qa

# Reiniciar servicios de QA
./scripts/infrastructure.sh restart-qa
```

### SSH Tunnel para Base de Datos

```bash
# Crear túnel SSH a QA (para debugging con datos reales)
./scripts/db-tunnel-qa.sh start

# Probar conexión
./scripts/db-tunnel-qa.sh test

# Detener túnel
./scripts/db-tunnel-qa.sh stop
```

## 📚 Documentación

- **[Infraestructura](docs/INFRASTRUCTURE.md)** - Arquitectura completa del sistema
- **[Variables de Entorno](docs/ENVIRONMENT_VARIABLES.md)** - Guía completa de configuración
- **[Conexión a Base de Datos](docs/DATABASE_CONNECTION.md)** - Opciones para desarrollo local
- **[Migraciones Prisma](docs/PRISMA_MIGRATIONS.md)** - Manejo de migraciones de base de datos

## 🔧 Scripts Disponibles

### Desarrollo
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linter
npm test             # Tests
```

### Infraestructura
```bash
./scripts/infrastructure.sh init        # Inicializar Terraform
./scripts/infrastructure.sh plan        # Ver plan de Terraform
./scripts/infrastructure.sh apply       # Aplicar cambios
./scripts/infrastructure.sh status      # Ver estado
./scripts/infrastructure.sh connect-qa # SSH a QA
```

### Base de Datos
```bash
./scripts/db-tunnel-qa.sh start        # Crear túnel SSH
./scripts/db-tunnel-qa.sh test         # Probar conexión
./scripts/db-tunnel-qa.sh stop         # Detener túnel
```

## 🚀 Flujo de Trabajo

### Desarrollo Diario
1. **Desarrollar** en tu máquina local con Supabase
2. **Crear migraciones** con `npx prisma migrate dev`
3. **Commitear** cambios
4. **Push a `qa`** para testing automático
5. **Verificar** en ambiente QA
6. **Push a `master`** para producción

### Activar Producción
```bash
# Editar terraform.tfvars
create_prod_droplet = true

# Aplicar cambios
cd terraform && terraform apply

# Agregar PROD_DROPLET_IP a GitHub Secrets
```

## 🔒 Seguridad

- ✅ Firewall UFW configurado
- ✅ SSH key-based authentication
- ✅ Variables sensibles en GitHub Secrets
- ✅ Nginx con headers de seguridad
- ✅ PostgreSQL no expuesto públicamente
- ✅ Rate limiting y protección DDoS


## 🆘 Troubleshooting

### Problemas Comunes

1. **Aplicación no responde**:
   ```bash
   ./scripts/infrastructure.sh logs-qa
   ./scripts/infrastructure.sh restart-qa
   ```

2. **Base de datos no conecta**:
   ```bash
   ./scripts/db-tunnel-qa.sh test
   ```

3. **GitHub Actions falla**:
   - Verificar GitHub Secrets
   - Verificar SSH key
   - Verificar IPs de Droplets

### Logs y Monitoreo

```bash
# Ver logs de aplicación
./scripts/infrastructure.sh logs-qa

# Ver logs de sistema
ssh root@[IP] "tail -f /var/log/syslog"

# Ver estado de contenedores
ssh root@[IP] "cd /opt/financieramente && docker-compose ps"
```

## 📞 Soporte

Para soporte técnico:
1. Revisar documentación en `/docs`
2. Verificar logs del sistema
3. Consultar GitHub Issues
4. Contactar al equipo de desarrollo

---


# Deployment test - Thu Oct 23 17:13:24 -05 2025
