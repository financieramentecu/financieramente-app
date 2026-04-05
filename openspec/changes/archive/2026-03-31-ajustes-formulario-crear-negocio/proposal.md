# Proposal: Ajustes Formulario Crear Negocio

## Goal
Mejorar la experiencia de usuario y la precisión de la información en el formulario "Crear Negocio" mediante ajustes en textos de ayuda, eliminación de mensajes confusos y renombrado de opciones de moneda.

## What Changes
1. **Eliminación de mensaje de ayuda:** Se removerá el texto "Si estas registrado a un negocio internacional elige el nombre del producto..." en la sección de información del producto.
2. **Renombrado de Moneda:** La opción "Dólar Americano" se mostrará como "Moneda Extranjera" en el selector de moneda.
3. **Actualización de mensaje de prima:** Se simplificará el texto informativo sobre el valor del negocio para indicar que el campo "Valor" debe ser equivalente al valor de la prima por 12.

## Capabilities

### Modified Capabilities
- `negocios`: Ajustes en la interfaz de usuario del formulario de creación y edición de negocios.

## Impact
- **Frontend:** Modificación de los componentes `ProductInfoSection` y `BusinessInfoSection`.
- **Hooks:** Ajuste en el mapeo de datos dentro de `useGetAllData` para transformar el label de la moneda USD.
- **UX:** Mayor claridad en las instrucciones para el usuario final.
