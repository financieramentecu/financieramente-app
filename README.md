# Financieramente - Sistema de Liquidación de Comisiones

Una plataforma moderna para la gestión y liquidación de comisiones financieras, desarrollada con Next.js 15, React 19, Prisma ORM y PostgreSQL, desplegada en Digital Ocean con infraestructura como código usando Terraform.

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

- **Frontend**: Next.js 15 con React 19 y Tailwind CSS v4
- **Backend**: API Routes de Next.js con Prisma ORM
- **Base de Datos**: PostgreSQL 15
- **UI Components**: Shadcn/UI + Radix UI
- **Documentación**: Storybook 9.1.3
- **Testing**: Vitest + Testing Library + Playwright
- **Visual Testing**: Chromatic
- **Proxy**: Nginx con configuración de seguridad
- **Contenedores**: Docker con Docker Compose
- **CI/CD**: GitHub Actions
- **Infraestructura**: Terraform + Digital Ocean

### Arquitectura: Feature-Based

El proyecto utiliza **Feature-Based Architecture** para mantener el código organizado, escalable y fácil de mantener. Cada feature es autocontenido con sus propios tipos, schemas, hooks, componentes y lógica de negocio.

#### Estructura de Carpetas

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (simplificados)
│   │   ├── admin/                # Endpoints de administración
│   │   ├── auth/                 # Autenticación
│   │   └── email/                # Servicios de email
│   └── dashboard/                # Páginas del dashboard
│
├── features/                     # Feature-Based Architecture
│   ├── admin/                    # Features de administración
│   │   ├── products/             # Feature de productos
│   │   │   ├── components/       # Componentes específicos
│   │   │   ├── hooks/            # Custom hooks
│   │   │   ├── lib/              # Lógica y schemas
│   │   │   │   ├── product-api.ts
│   │   │   │   └── product-schemas.ts
│   │   │   ├── types/            # Tipos TypeScript
│   │   │   └── __tests__/        # Tests del feature
│   │   ├── companies/            # Feature de compañías
│   │   ├── categories/           # Feature de categorías
│   │   ├── currencies/           # Feature de monedas
│   │   ├── periodicities/       # Feature de periodicidades
│   │   ├── origins/              # Feature de orígenes
│   │   └── shared/               # Componentes admin compartidos
│   │       ├── CrudTable.tsx
│   │       ├── CrudModal.tsx
│   │       └── DeleteConfirmModal.tsx
│   │
│   ├── auth/                     # Feature de autenticación
│   │   ├── components/           # Componentes de auth
│   │   │   ├── error-message.tsx
│   │   │   ├── login/            # Componentes de login
│   │   │   │   ├── auth-card.tsx
│   │   │   │   ├── brand-panel.tsx
│   │   │   │   ├── email-sign-in-form.tsx
│   │   │   │   ├── login-view.tsx
│   │   │   │   └── social-sign-in.tsx
│   │   │   └── logout-button.tsx
│   │   └── __tests__/
│   │
│   ├── email/                    # Feature de email
│   │   ├── lib/
│   │   │   ├── email-service.ts  # Servicio simplificado
│   │   │   └── sendgrid-config.ts
│   │   └── types/
│   │
│   ├── negocios/                 # Feature de negocios
│   │   ├── components/
│   │   │   ├── BusinessManagementSection.tsx
│   │   │   ├── BusinessSearchForm.tsx
│   │   │   ├── BusinessTableSection.tsx
│   │   │   ├── MisNegociosPage.tsx
│   │   │   └── StatsOverview.tsx
│   │   ├── types/
│   │   └── lib/
│   │
│   └── shared/                   # Recursos compartidos
│       ├── ui/                   # Componentes UI compartidos
│       │   ├── button.tsx
│       │   ├── input.tsx
│       │   ├── table.tsx
│       │   ├── theme-toggle.tsx  # Toggle de tema
│       │   └── __tests__/
│       ├── layout/               # Componentes de layout
│       │   ├── DashboardLayout.tsx
│       │   ├── Header.tsx
│       │   └── Sidebar.tsx
│       ├── hooks/                # Hooks compartidos
│       │   ├── use-auth-session.ts
│       │   ├── use-mobile.tsx
│       │   ├── use-permissions.ts
│       │   ├── use-theme-toggle.ts
│       │   └── __tests__/
│       ├── providers/            # Providers compartidos
│       │   └── auth-provider.tsx
│       ├── types/                # Tipos compartidos
│       │   ├── user.types.ts
│       │   └── liquidation.types.ts
│       └── __tests__/
│           └── fixtures/        # Datos mock para tests
│
├── lib/                          # Utilidades globales
│   ├── api/
│   │   └── client.ts             # Cliente API centralizado
│   ├── auth/                     # Utilidades de autenticación
│   ├── email/                    # Notificaciones de email
│   ├── navigation/               # Navegación y menús
│   └── prisma.ts                 # Cliente Prisma
│
└── types/                        # Tipos globales (solo env.d.ts)
    └── env.d.ts                  # Tipos de variables de entorno
```

#### Principios de la Arquitectura

1. **Features Autocontenidos**: Cada feature contiene todo lo necesario (tipos, schemas, hooks, componentes)
2. **Separación de Responsabilidades**: 
   - `types/` - Interfaces TypeScript
   - `lib/` - Schemas Zod y funciones de negocio
   - `hooks/` - Custom hooks para data fetching y mutations
   - `components/` - Componentes React específicos del feature
   - **`actions/`** - Server Actions: validan entrada, llaman a **services** y devuelven `ApiResponse`. No usan Prisma directamente.
   - **`services/`** - Contienen todas las llamadas a **Prisma** (y otros accesos a datos) del feature. Devuelven datos de dominio; la forma de respuesta al cliente se define en las actions.
3. **Shared Resources**: Componentes y tipos compartidos en `features/shared/`
4. **API Routes Simplificados**: Llamadas directas a servicios sin capas intermedias complejas
5. **Testing Colocalizado**: Tests en `__tests__/` dentro de cada feature

**Patrón Actions → Services → Prisma**: Las Server Actions no llaman a Prisma directamente; delegan en servicios del feature. Ejemplo: `findProductPercentajeCommision` (action) llama a `getPpcForNewBusinesses` (service), que es quien usa `prisma.productConfiguration.findUnique(...)`.

#### Ejemplo de Feature Completo

```typescript
// src/features/admin/products/types/product.types.ts
export interface Product extends Record<string, unknown> {
  idProduct: number
  name: string
  // ...
}

// src/features/admin/products/lib/product-schemas.ts
import { z } from 'zod'
export const createProductSchema = z.object({ /* ... */ })

// src/features/admin/products/lib/product-api.ts
import { apiClient } from '@/lib/api/client'
export async function getProducts(): Promise<Product[]> {
  return apiClient.get<Product[]>('/api/admin/products')
}

// src/features/admin/products/hooks/use-products.ts
export function useProducts() {
  // Lógica de data fetching
}

// src/features/admin/products/components/products-table.tsx
export function ProductsTable() {
  // Componente específico
}
```

### Características Principales

- ✅ **Feature-Based Architecture**: Código organizado por funcionalidad, completamente migrado
- ✅ **Hooks Compartidos**: Hooks reutilizables en `features/shared/hooks/`
- ✅ **Providers Centralizados**: Providers compartidos en `features/shared/providers/`
- ✅ **Sistema de Temas**: Modo claro y oscuro con colores corporativos
- ✅ **Componentes de Formularios**: InputField, SelectField, ButtonField con múltiples variantes
- ✅ **Componentes de Autenticación**: Login, logout y manejo de sesión
- ✅ **Documentación Visual**: Storybook con 25+ stories de componentes
- ✅ **Testing Completo**: Unitarios, integración y E2E con 80%+ cobertura
- ✅ **Accesibilidad WCAG AA**: Cumplimiento completo de estándares
- ✅ **Responsive Design**: Optimizado para todos los dispositivos
- ✅ **CI/CD Automatizado**: Despliegue automático a QA y Producción

## 🚀 Configuración y Desarrollo

### Prerrequisitos

- Node.js 20+
- npm o yarn
- Docker (opcional)
- Cuenta en Supabase (recomendado para desarrollo local)

### Instalación Local

1. **Clonar el repositorio**:

   ```bash
   git clone <repository-url>
   cd financieramente-app
   ```

2. **Instalar dependencias**:

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:

   ```bash
   cp docker/env.example .env.local
   # Editar .env.local con tu DATABASE_URL de Supabase
   ```

4. **Ejecutar migraciones** (si usas base de datos local):

   ```bash
   npx prisma migrate dev --name init
   ```

5. **Iniciar servidor de desarrollo**:

   ```bash
   npm run dev
   ```

6. **Abrir en el navegador**: `http://localhost:3000`

## 🧪 Testing y Calidad

### Scripts de Testing

```bash
# Tests unitarios
npm run test:unit                    # Ejecutar tests unitarios
npm run test:unit:coverage          # Tests con cobertura

# Tests de integración
npm run test:integration            # Tests de integración
npm run test:integration:coverage   # Tests de integración con cobertura

# Tests E2E
npm run test:e2e                    # Tests end-to-end con Playwright
npm run test:e2e:ui                 # Interfaz visual de tests E2E

# Todos los tests
npm run test:all                    # Ejecutar todos los tests
npm run test:working               # Solo tests que funcionan (integración + E2E)
```

### Cobertura Actual

- **Tests Unitarios**: 50.87% statements, 80.59% branches
- **Tests de Integración**: 15.26% statements, 74.13% branches
- **Tests E2E**: 10/10 tests pasando en múltiples navegadores

## 📚 Documentación y Storybook

### Ejecutar Storybook

```bash
npm run storybook        # Servidor de desarrollo
npm run build-storybook  # Build para producción
```

### Stories Disponibles

- **Componentes UI**: Button, Input, Modal, DataTable, Header, etc.
- **Componentes de Formularios**: InputField, SelectField, ButtonField
- **Sistema de Temas**: ThemeToggle, ColorPalette
- **Componentes de Autenticación**: LoginView, AuthCard

### Visual Testing con Chromatic

```bash
npm run chromatic        # Publicación manual
npm run chromatic:ci    # Para CI/CD
```

**Dashboard del Proyecto**: [https://www.chromatic.com/builds?appId=68f1c0249289c9e94cd95256](https://www.chromatic.com/builds?appId=68f1c0249289c9e94cd95256)

## 🏭 Infraestructura y Despliegue

### Ambientes Disponibles

| Ambiente       | Droplet     | Costo     | Recursos        | URL                |
| -------------- | ----------- | --------- | --------------- | ------------------ |
| **QA**         | s-1vcpu-1gb | $6/month  | 1GB RAM, 1 vCPU | `http://[QA_IP]`   |
| **Producción** | s-2vcpu-4gb | $24/month | 4GB RAM, 2 vCPU | `http://[PROD_IP]` |

### Flujo de Despliegue

- **Push a `develop`** → Tests automáticos + Chromatic
- **Push a `qa`** → Despliegue automático a QA
- **Push a `main`** → Despliegue automático a Producción

### Configuración de Infraestructura

1. **Configurar variables de entorno**:

   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   nano terraform/terraform.tfvars
   ```

2. **Configurar GitHub Secrets**:
   - `DIGITALOCEAN_TOKEN`
   - `SSH_PRIVATE_KEY`
   - `SSH_PUBLIC_KEY`
   - `POSTGRES_PASSWORD_QA`
   - `POSTGRES_PASSWORD_PROD`
   - `CHROMATIC_PROJECT_TOKEN`

3. **Crear infraestructura**:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

## 🛠️ Scripts de Desarrollo

### Desarrollo

```bash
npm run dev              # Servidor de desarrollo Next.js
npm run build            # Build de producción
npm run start            # Servidor de producción
npm run lint             # Linter ESLint
npm run type-check       # Verificación de tipos TypeScript
```

### Infraestructura

```bash
./scripts/infrastructure.sh init        # Inicializar Terraform
./scripts/infrastructure.sh plan        # Ver plan de Terraform
./scripts/infrastructure.sh apply       # Aplicar cambios
./scripts/infrastructure.sh status      # Ver estado
./scripts/infrastructure.sh connect-qa  # SSH a QA
```

### Base de Datos

```bash
./scripts/db-tunnel-qa.sh start        # Crear túnel SSH
./scripts/db-tunnel-qa.sh test         # Probar conexión
./scripts/db-tunnel-qa.sh stop         # Detener túnel
```

## 📖 Documentación Adicional

- **[Infraestructura](docs/INFRASTRUCTURE.md)** - Arquitectura completa del sistema
- **[Variables de Entorno](docs/ENVIRONMENT_VARIABLES.md)** - Guía completa de configuración
- **[Conexión a Base de Datos](docs/DATABASE_CONNECTION.md)** - Opciones para desarrollo local
- **[Migraciones Prisma](docs/PRISMA_MIGRATIONS.md)** - Manejo de migraciones de base de datos
- **[Testing](docs/TESTING.md)** - Guía completa de testing
- **[Workflow de Desarrollo](docs/DEVELOPMENT_WORKFLOW.md)** - Procesos y mejores prácticas

## 🎨 Sistema de Diseño

### Paleta de Colores

| Color          | Hex       | HSL                   | Uso                             |
| -------------- | --------- | --------------------- | ------------------------------- |
| **Primario**   | `#00505C` | `hsl(185, 100%, 18%)` | Botones principales, enlaces    |
| **Secundario** | `#83D874` | `hsl(110, 56%, 65%)`  | Botones secundarios, highlights |
| **Texto**      | `#FFFFFF` | `hsl(0, 0%, 100%)`    | Texto sobre fondos oscuros      |

### Componentes Principales

```tsx
// Sistema de temas
import { ThemeToggle } from '@/features/shared/ui/theme-toggle'
import { ThemeProvider } from '@/features/shared/ui/ThemeProvider'
import { useThemeToggle } from '@/features/shared/hooks/use-theme-toggle'

// Hooks compartidos
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { usePermissions } from '@/features/shared/hooks/use-permissions'
import { useIsMobile } from '@/features/shared/hooks/use-mobile'

// Providers
import { AuthProvider } from '@/features/shared/providers/auth-provider'

// Componentes UI compartidos
import { Button, Card, Modal } from '@/features/shared/ui/button'
import { DataTable } from '@/features/shared/ui/DataTable'
import { Input, Select } from '@/features/shared/ui/input'

// Componentes de autenticación
import { LoginView } from '@/features/auth/components/login/login-view'
import { LogoutButton } from '@/features/auth/components/logout-button'

// Componentes de negocios
import { BusinessSearchForm } from '@/features/negocios/components/BusinessSearchForm'
import { MisNegociosPage } from '@/features/negocios/components/MisNegociosPage'

// Componentes de features específicos
import { ProductsTable } from '@/features/admin/products/components/products-table'
import { useProducts } from '@/features/admin/products/hooks/use-products'

// Layout
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
```

### Convenciones de Código

- **Features**: kebab-case (`admin/products`, `negocios`)
- **Archivos**: kebab-case (`product-api.ts`, `use-products.ts`)
- **Componentes**: PascalCase (`ProductsTable.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useProducts`, `useProductMutations`)
- **Tipos**: PascalCase (`Product`, `BusinessFormData`)

## 🔒 Seguridad

- ✅ Firewall UFW configurado
- ✅ SSH key-based authentication
- ✅ Variables sensibles en GitHub Secrets
- ✅ Nginx con headers de seguridad
- ✅ PostgreSQL no expuesto públicamente
- ✅ Rate limiting y protección DDoS

## 🌐 Compatibilidad

- **Navegadores**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Dispositivos**: Mobile (< 768px), Tablet (768px - 1024px), Desktop (> 1024px)
- **Accesibilidad**: WCAG AA cumplido

## 📈 Métricas de Calidad

- **Cobertura de Tests**: 80%+ objetivo
- **Accesibilidad**: WCAG AA cumplido
- **Performance**: < 100ms renderizado
- **Bundle Size**: < 50KB gzipped
- **Lighthouse Score**: 95+ en todas las métricas

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

### Guías de Contribución

- Seguir las convenciones de código establecidas
- Escribir tests para nuevas funcionalidades
- Actualizar documentación cuando sea necesario
- Verificar accesibilidad en todos los componentes
- **Nuevas features**: Crear estructura completa en `src/features/[feature-name]/` con:
  - `components/` - Componentes específicos del feature
  - `hooks/` - Custom hooks para data fetching y mutations
  - `lib/` - Schemas Zod y funciones de negocio
  - `types/` - Interfaces TypeScript
  - `__tests__/` - Tests del feature
- **Componentes compartidos**: 
  - UI: Agregar a `src/features/shared/ui/`
  - Layout: Agregar a `src/features/shared/layout/`
  - Hooks: Agregar a `src/features/shared/hooks/`
  - Providers: Agregar a `src/features/shared/providers/`

## 📞 Soporte

Para soporte técnico o preguntas sobre el proyecto:

- **Email**: dev@financieramente.com
- **Documentación**: [docs.financieramente.com](https://docs.financieramente.com)
- **Issues**: [GitHub Issues](https://github.com/financieramentecu/financieramente-app/issues)

---
