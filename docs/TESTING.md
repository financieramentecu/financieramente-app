# Testing Guide

Esta guía explica cómo escribir y ejecutar tests en el proyecto Financieramente.

## 📚 Índice

- [Tipos de Tests](#tipos-de-tests)
- [Convenciones de Naming](#convenciones-de-naming)
- [Tests Unitarios](#tests-unitarios)
- [Tests de Integración](#tests-de-integración)
- [Tests E2E](#tests-e2e)
- [Ejecutar Tests](#ejecutar-tests)
- [Debugging](#debugging)
- [Cobertura](#cobertura)
- [Mejores Prácticas](#mejores-prácticas)

## Tipos de Tests

### Unit Tests (`*.test.tsx`)
Tests rápidos y aislados de componentes individuales o funciones puras.

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '../button'

describe('Button Component', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### Integration Tests (`*.integration.test.tsx`)
Tests que verifican la interacción entre múltiples componentes.

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Page from '@/app/page'

describe('Home Page Integration', () => {
  it('renders all components', async () => {
    render(<Page />)
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })
})
```

### E2E Tests (`e2e/*.spec.ts`)
Tests end-to-end que verifican flujos completos en el navegador.

```typescript
import { test, expect } from '@playwright/test'

test('should load home page', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Financieramente/)
})
```

## Convenciones de Naming

- **Unit tests**: `*.test.tsx` o `*.test.ts`
- **Integration tests**: `*.integration.test.tsx`
- **E2E tests**: `e2e/*.spec.ts`
- **Stories**: `*.stories.tsx` (no se ejecutan como tests)

## Tests Unitarios

### Ubicación
```
src/components/ui/__tests__/button.test.tsx
src/hooks/__tests__/use-theme-toggle.test.ts
```

### Características
- ⚡ Ejecución rápida (< 100ms por test)
- 🎯 Tests aislados
- 🔧 Mocking simple
- ⏱️ Timeout: 5s por defecto

### Ejemplo Completo

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDisabled()
  })
})
```

## Tests de Integración

### Ubicación
```
src/app/__tests__/integration/page.integration.test.tsx
```

### Características
- 🔗 Verifica interacción entre componentes
- ⏱️ Timeout más largo: 10s
- 🌐 Puede requerir mockeo de servicios externos

### Ejemplo

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Page from '@/app/page'

describe('Home Page Integration', () => {
  it('renders and loads all components', async () => {
    render(<Page />)
    
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })
})
```

## Tests E2E

### Ubicación
```
e2e/home.spec.ts
e2e/auth/login.spec.ts
```

### Características
- 🌐 Ejecutados en navegadores reales
- ⏱️ Timeout: configurable por proyecto
- 📸 Screenshots automáticos en fallos
- 🎥 Videos en retries

### Ejemplo

```typescript
import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load and display content', async ({ page }) => {
    await page.goto('/')
    
    await expect(page).toHaveTitle(/Financieramente/)
    await expect(page.locator('main')).toBeVisible()
  })

  test('should navigate using links', async ({ page }) => {
    await page.goto('/')
    
    const link = page.locator('a').first()
    if (await link.count() > 0) {
      await link.click()
      await expect(page).not.toHaveURL('/')
    }
  })
})
```

## Ejecutar Tests

### Todos los tests
```bash
npm run test:all
```

### Solo unit tests
```bash
npm run test:unit
npm run test:unit:coverage
```

### Solo integration tests
```bash
npm run test:integration
npm run test:integration:coverage
```

### Solo E2E tests
```bash
npm run test:e2e
npm run test:e2e:ui      # Con interfaz visual
npm run test:e2e:debug   # Modo debug
npm run test:e2e:headed  # Con navegador visible
```

### Modo watch (desarrollo)
```bash
npm run test:watch
```

### Interfaz visual de Vitest
```bash
npm run test:ui
```

## Debugging

### Vitest (Unit & Integration)
```bash
# Modo watch
npm run test:watch

# Con interfaz visual
npm run test:ui

# Debug en VSCode
# Usar .vscode/launch.json configurado para Vitest
```

### Playwright (E2E)
```bash
# Debug interactivo
npm run test:e2e:debug

# Ver navegador
npm run test:e2e:headed

# Ver un test específico
npx playwright test e2e/home.spec.ts --debug
```

## Cobertura

### Thresholds Mínimos
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

### Ver Reporte
```bash
npm run test:unit:coverage
# Abrir coverage/index.html en el navegador
```

## Mejores Prácticas

### 1. Arrange-Act-Assert
```typescript
it('should calculate total', () => {
  // Arrange
  const items = [10, 20, 30]
  
  // Act
  const total = calculateTotal(items)
  
  // Assert
  expect(total).toBe(60)
})
```

### 2. Tests Descriptivos
```typescript
// ❌ Mal
it('test 1', () => {})

// ✅ Bien
it('should disable button when loading is true', () => {})
```

### 3. Usar Queries Accesibles
```typescript
// ❌ Mal
screen.getByTestId('submit-button')

// ✅ Bien
screen.getByRole('button', { name: /submit/i })
```

### 4. Mockear Dependencias Externas
```typescript
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))
```

### 5. Limpiar Después de Cada Test
```typescript
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

### 6. Tests Aislados
```typescript
// ❌ Mal: dependen del orden
it('creates user', () => {})
it('gets user', () => {})

// ✅ Bien: cada test es independiente
it('creates user', () => {
  // Setup completo
})
it('gets user', () => {
  // Setup completo
})
```

## Integración con CI/CD

Los tests se ejecutan automáticamente en:
- PRs a `qa` o `main`
- Push a cualquier rama protegida

Ver [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) para detalles del flujo completo.

## Recursos

- [Testing Library](https://testing-library.com/)
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Storybook Testing](https://storybook.js.org/docs/writing-tests)

