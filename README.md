# Financieramente - Plataforma de Liquidación de Comisiones

Una plataforma moderna para la gestión y liquidación de comisiones financieras, desarrollada con Next.js, Shadcn/UI, Tailwind CSS y Storybook.

## 🚀 Características Principales

### Sistema de Temas Completo
- ✅ **Modo Claro y Oscuro**: Cambio dinámico entre temas
- ✅ **Colores Corporativos**: Paleta personalizada de Financieramente
- ✅ **Accesibilidad WCAG AA**: Cumplimiento completo de estándares
- ✅ **Responsive Design**: Optimizado para todos los dispositivos

### Componentes de Formularios
- ✅ **InputField**: Campos de texto con múltiples tipos y variantes
- ✅ **SelectField**: Selección avanzada con búsqueda y multi-select
- ✅ **ButtonField**: Botones con múltiples variantes y estados
- ✅ **LabelField**: Etiquetas con tooltips e indicadores

### Documentación Visual
- ✅ **Storybook**: Documentación interactiva de componentes
- ✅ **Chromatic**: Revisión visual y control de cambios
- ✅ **Tests Automatizados**: Cobertura del 80%+
- ✅ **Accesibilidad**: Validación WCAG AA integrada

## 🎨 Paleta de Colores

| Color | Hex | HSL | Uso |
|-------|-----|-----|-----|
| **Primario** | `#00505C` | `hsl(185, 100%, 18%)` | Botones principales, enlaces |
| **Secundario** | `#83D874` | `hsl(110, 56%, 65%)` | Botones secundarios, highlights |
| **Texto** | `#FFFFFF` | `hsl(0, 0%, 100%)` | Texto sobre fondos oscuros |

## 🛠 Tecnologías

- **Framework**: Next.js 15.5.0
- **UI Library**: Shadcn/UI + Radix UI
- **Styling**: Tailwind CSS v4
- **Documentation**: Storybook 9.1.3
- **Visual Testing**: Chromatic
- **Testing**: Vitest + Testing Library
- **Type Safety**: TypeScript 5

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/financieramente/app.git
cd financieramente-app

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

## 🚀 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo Next.js
npm run storybook        # Servidor de desarrollo Storybook

# Construcción
npm run build            # Construir aplicación Next.js
npm run build-storybook  # Construir Storybook para producción

# Testing
npm run test             # Ejecutar tests unitarios
npm run test:ui          # Interfaz visual de tests
npm run test:coverage    # Tests con reporte de cobertura
npm run test:snapshot    # Tests de snapshot

# Linting
npm run lint             # Verificar código con ESLint

# Chromatic
npm run chromatic        # Publicar en Chromatic
npm run chromatic:ci     # Publicar en CI/CD
```

## 📚 Documentación

### Componentes de Formularios

#### InputField
```tsx
import { InputField } from '@/components/forms'

<InputField 
  label="Email" 
  type="email" 
  required 
  leftIcon={<MailIcon />}
  helperText="Ingresa tu correo electrónico"
/>
```

#### SelectField
```tsx
import { SelectField } from '@/components/forms'

<SelectField 
  label="País" 
  options={countryOptions}
  searchable
  clearable
  multiple
/>
```

#### ButtonField
```tsx
import { ButtonField, PrimaryButton } from '@/components/forms'

<ButtonField variant="primary" loading>
  Guardar
</ButtonField>

<PrimaryButton leftIcon={<SaveIcon />}>
  Guardar Cambios
</PrimaryButton>
```

### Sistema de Temas

```tsx
import { ThemeToggle } from '@/components/theme-toggle'
import { useThemeToggle } from '@/hooks/use-theme-toggle'

// Componente de cambio de tema
<ThemeToggle />

// Hook para gestión de temas
const { theme, toggleTheme } = useThemeToggle()
```

## 🧪 Testing

### Tests Unitarios
```bash
npm run test
```

### Cobertura de Tests
```bash
npm run test:coverage
```

### Tests de Accesibilidad
Los tests de accesibilidad están integrados en Storybook y se ejecutan automáticamente.

## 📖 Storybook

### Ejecutar Storybook
```bash
npm run storybook
```

### Construir Storybook
```bash
npm run build-storybook
```

### Stories Disponibles
- **Forms/InputField**: 15+ variaciones
- **Forms/LabelField**: 8+ variaciones
- **Forms/SelectField**: 12+ variaciones
- **Forms/ButtonField**: 20+ variaciones
- **Components/ThemeToggle**: 3+ variaciones
- **Design System/Color Palette**: Temas claro y oscuro

## 🌈 Chromatic

### Configuración
1. Crear cuenta en [Chromatic](https://www.chromatic.com/)
2. Obtener el project token
3. Configurar como secret en GitHub: `CHROMATIC_PROJECT_TOKEN`

### Publicación Manual
```bash
npm run chromatic
```

### CI/CD Automático
El despliegue automático está configurado en GitHub Actions y se ejecuta en cada push/PR.

## ♿ Accesibilidad

### Características Implementadas
- **Contraste WCAG AA**: Ratios mínimos de 4.5:1
- **Navegación por Teclado**: Soporte completo
- **Screen Readers**: Etiquetas ARIA apropiadas
- **Focus Management**: Indicadores visibles y orden lógico

### Validación
```bash
# Tests de accesibilidad en Storybook
npm run storybook
# Navegar a Addons > Accessibility
```

## 🌐 Compatibilidad de Navegadores

- ✅ **Chrome** 90+
- ✅ **Firefox** 88+
- ✅ **Safari** 14+
- ✅ **Edge** 90+

## 📱 Responsive Design

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔧 Configuración de Desarrollo

### Variables de Entorno
```bash
# .env.local
CHROMATIC_PROJECT_TOKEN=your_token_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Estructura del Proyecto
```
src/
├── app/                    # App Router de Next.js
├── components/
│   ├── ui/                # Componentes Shadcn/UI
│   ├── forms/             # Componentes de formularios
│   └── theme-toggle.tsx   # Componente de cambio de tema
├── hooks/                 # Hooks personalizados
├── lib/                   # Utilidades
└── stories/               # Stories de Storybook
```

## 📈 Métricas de Calidad

- **Cobertura de Tests**: 80%+
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

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas sobre el proyecto:

- **Email**: dev@financieramente.com
- **Documentación**: [docs.financieramente.com](https://docs.financieramente.com)
- **Issues**: [GitHub Issues](https://github.com/financieramente/app/issues)

---

**Desarrollado con ❤️ por el equipo de Financieramente**

*Última actualización: Diciembre 2024*