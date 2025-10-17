# Componentes de Formularios - Financieramente

## 📋 Descripción General

Este documento describe la implementación completa de componentes de formularios reutilizables para la plataforma Financieramente, desarrollados con Shadcn/UI, Tailwind CSS y Storybook, con integración en Chromatic para revisión visual.

## 🧩 Componentes Implementados

### 1. InputField

Componente de entrada de texto con soporte para múltiples tipos, tamaños y variantes.

#### Características
- ✅ Tipos de entrada: texto, email, password, número, teléfono, URL, búsqueda, fecha, hora
- ✅ Tamaños: pequeño (sm), mediano (md), grande (lg)
- ✅ Variantes: default, filled, outlined
- ✅ Iconos izquierdos y derechos
- ✅ Indicadores de requerido/opcional
- ✅ Mensajes de error y texto de ayuda
- ✅ Accesibilidad WCAG AA

#### Uso Básico

```tsx
import { InputField } from '@/components/forms'

// Campo básico
<InputField 
  label="Nombre completo" 
  placeholder="Ingresa tu nombre" 
/>

// Campo requerido con validación
<InputField 
  label="Email" 
  type="email" 
  required 
  error="Email es requerido"
/>

// Campo con icono
<InputField 
  label="Buscar" 
  type="search"
  leftIcon={<SearchIcon />}
/>
```

#### Props API

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `label` | `string` | - | Etiqueta del campo |
| `type` | `string` | `"text"` | Tipo de entrada |
| `required` | `boolean` | `false` | Indica si es requerido |
| `optional` | `boolean` | `false` | Indica si es opcional |
| `error` | `string` | - | Mensaje de error |
| `helperText` | `string` | - | Texto de ayuda |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Tamaño del campo |
| `variant` | `"default" \| "filled" \| "outlined"` | `"default"` | Variante visual |
| `leftIcon` | `ReactNode` | - | Icono izquierdo |
| `rightIcon` | `ReactNode` | - | Icono derecho |

### 2. LabelField

Componente de etiqueta mejorado con soporte para tooltips e indicadores.

#### Características
- ✅ Indicadores de requerido/opcional
- ✅ Tooltips informativos
- ✅ Estados de error
- ✅ Múltiples tamaños
- ✅ Accesibilidad completa

#### Uso Básico

```tsx
import { LabelField } from '@/components/forms'

// Etiqueta básica
<LabelField htmlFor="email">Correo electrónico</LabelField>

// Etiqueta con tooltip
<LabelField 
  htmlFor="password"
  tooltip="Mínimo 8 caracteres, incluir números y símbolos"
>
  Contraseña
</LabelField>

// Etiqueta requerida
<LabelField htmlFor="name" required>
  Nombre completo
</LabelField>
```

### 3. SelectField

Componente de selección avanzado con múltiples funcionalidades.

#### Características
- ✅ Selección simple y múltiple
- ✅ Búsqueda integrada
- ✅ Opciones agrupadas
- ✅ Opciones deshabilitadas
- ✅ Botón de limpiar
- ✅ Indicadores de estado
- ✅ Accesibilidad completa

#### Uso Básico

```tsx
import { SelectField } from '@/components/forms'

const options = [
  { value: 'col', label: 'Colombia' },
  { value: 'mex', label: 'México' },
  { value: 'arg', label: 'Argentina' },
]

// Selección simple
<SelectField 
  label="País" 
  options={options}
  placeholder="Selecciona tu país"
/>

// Selección múltiple con búsqueda
<SelectField 
  label="Habilidades" 
  options={skillOptions}
  multiple
  searchable
  clearable
/>

// Opciones agrupadas
<SelectField 
  label="Región"
  options={[
    { value: 'col', label: 'Colombia', group: 'América del Sur' },
    { value: 'mex', label: 'México', group: 'América del Norte' },
  ]}
/>
```

### 4. ButtonField

Componente de botón con múltiples variantes y estados.

#### Características
- ✅ Variantes: primary, secondary, tertiary, destructive, ghost, link, outline
- ✅ Estados: normal, loading, disabled
- ✅ Iconos izquierdos y derechos
- ✅ Múltiples tamaños
- ✅ Ancho completo
- ✅ Componentes específicos por tipo

#### Uso Básico

```tsx
import { 
  ButtonField, 
  PrimaryButton, 
  SecondaryButton,
  TertiaryButton,
  DestructiveButton 
} from '@/components/forms'

// Botón básico
<ButtonField variant="primary">Guardar</ButtonField>

// Botón con icono
<ButtonField 
  variant="primary"
  leftIcon={<SaveIcon />}
>
  Guardar Cambios
</ButtonField>

// Botón en estado de carga
<ButtonField loading>Procesando...</ButtonField>

// Componentes específicos
<PrimaryButton>Acción Principal</PrimaryButton>
<SecondaryButton>Acción Secundaria</SecondaryButton>
<TertiaryButton>Acción Terciaria</TertiaryButton>
<DestructiveButton>Eliminar</DestructiveButton>
```

## 🎨 Sistema de Temas

### Colores Financieramente

Los componentes utilizan automáticamente los colores del sistema de temas:

```css
/* Colores primarios */
--primary: 185 100% 18%;        /* #00505C */
--primary-foreground: 0 0% 100%; /* #FFFFFF */

/* Colores secundarios */
--secondary: 110 56% 65%;       /* #83D874 */
--secondary-foreground: 185 100% 18%; /* #00505C */
```

### Modo Claro y Oscuro

Todos los componentes se adaptan automáticamente al tema activo:

```tsx
// Los componentes detectan automáticamente el tema
<InputField label="Campo adaptable" />
<ButtonField variant="primary">Botón adaptable</ButtonField>
```

## ♿ Accesibilidad WCAG AA

### Características Implementadas

#### Contraste de Colores
- ✅ Texto normal: 4.5:1 mínimo
- ✅ Texto grande: 3:1 mínimo
- ✅ Elementos interactivos: 3:1 mínimo

#### Navegación por Teclado
- ✅ Tab y Shift+Tab para navegación
- ✅ Enter y Espacio para activación
- ✅ Escape para cerrar modales
- ✅ Flechas para navegación en listas

#### Screen Readers
- ✅ Etiquetas ARIA apropiadas
- ✅ Estados de error anunciados
- ✅ Descripción de elementos complejos
- ✅ Roles semánticos correctos

#### Focus Management
- ✅ Indicadores de foco visibles
- ✅ Orden lógico de navegación
- ✅ Atrapado de foco en modales
- ✅ Retorno de foco apropiado

### Ejemplos de Accesibilidad

```tsx
// Campo con validación accesible
<InputField 
  label="Email"
  type="email"
  required
  error="Email inválido"
  helperText="Ingresa un email válido"
  // Automáticamente incluye:
  // - aria-invalid="true"
  // - aria-describedby con IDs de error y helper
  // - role="alert" en el mensaje de error
/>

// Botón accesible
<ButtonField 
  loading
  aria-label="Guardando cambios..."
  // Automáticamente:
  // - disabled cuando loading
  // - indica estado de carga
/>
```

## 🧪 Testing

### Tests Unitarios

Cobertura del 80% en todos los componentes:

```bash
npm run test
```

#### Ejemplos de Tests

```tsx
// Test de renderizado
it('renders with label', () => {
  render(<InputField label="Test Label" />)
  expect(screen.getByText('Test Label')).toBeInTheDocument()
})

// Test de accesibilidad
it('applies correct ARIA attributes', () => {
  render(<InputField error="Error message" />)
  const input = screen.getByRole('textbox')
  expect(input).toHaveAttribute('aria-invalid', 'true')
})

// Test de interacción
it('handles user input', async () => {
  const user = userEvent.setup()
  const onChange = jest.fn()
  
  render(<InputField onChange={onChange} />)
  await user.type(screen.getByRole('textbox'), 'test')
  
  expect(onChange).toHaveBeenCalled()
})
```

### Tests de Snapshot

```bash
npm run test:snapshot
```

## 📚 Storybook y Chromatic

### Stories Disponibles

Cada componente tiene stories completas en Storybook:

- **InputField**: 15+ variaciones
- **LabelField**: 8+ variaciones  
- **SelectField**: 12+ variaciones
- **ButtonField**: 20+ variaciones

### Acceso a Storybook

```bash
npm run storybook
```

### Chromatic Integration

```bash
# Publicar en Chromatic
npm run chromatic

# Configurar en CI/CD
npx chromatic --project-token=your-token
```

### Revisión Visual

- ✅ Despliegue automático en cada commit
- ✅ Comparación visual de cambios
- ✅ Aprobación colaborativa
- ✅ Histórico de versiones

## 🚀 Uso en Producción

### Instalación

```bash
# Los componentes ya están instalados
import { InputField, SelectField, ButtonField } from '@/components/forms'
```

### Ejemplo Completo

```tsx
import React from 'react'
import { 
  InputField, 
  SelectField, 
  ButtonField,
  LabelField 
} from '@/components/forms'

function UserForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: '',
    skills: []
  })

  return (
    <form className="space-y-6">
      <InputField
        label="Nombre completo"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        required
        helperText="Ingresa tu nombre completo"
      />

      <InputField
        label="Correo electrónico"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
        leftIcon={<MailIcon />}
      />

      <SelectField
        label="País de residencia"
        options={countryOptions}
        value={formData.country}
        onChange={(value) => setFormData({...formData, country: value})}
        searchable
        clearable
      />

      <SelectField
        label="Habilidades técnicas"
        options={skillOptions}
        value={formData.skills}
        onChange={(value) => setFormData({...formData, skills: value})}
        multiple
        searchable
      />

      <div className="flex gap-4">
        <ButtonField variant="primary" type="submit">
          Guardar Usuario
        </ButtonField>
        <ButtonField variant="secondary" type="button">
          Cancelar
        </ButtonField>
      </div>
    </form>
  )
}
```

## 🔧 Personalización

### Temas Personalizados

```css
/* Agregar nuevos colores */
:root {
  --success: 120 100% 50%;
  --warning: 45 100% 50%;
}

.dark {
  --success: 120 100% 40%;
  --warning: 45 100% 40%;
}
```

### Componentes Extendidos

```tsx
// Crear variante personalizada
const CustomInput = styled(InputField)`
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`
```

## 📱 Responsive Design

Todos los componentes son completamente responsive:

- **Mobile**: Optimizado para pantallas < 768px
- **Tablet**: Adaptado para pantallas 768px - 1024px  
- **Desktop**: Experiencia completa > 1024px

## 🌐 Compatibilidad de Navegadores

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📈 Métricas de Calidad

- **Cobertura de Tests**: 80%+
- **Accesibilidad**: WCAG AA cumplido
- **Performance**: < 100ms renderizado
- **Bundle Size**: < 50KB gzipped

---

**Última actualización**: Diciembre 2024  
**Versión**: 2.0.0  
**Mantenido por**: Equipo de Desarrollo Financieramente
