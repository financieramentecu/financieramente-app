# Especificación de Búsqueda en Filtros Avanzados

## 1. Feature Description
El modal de Filtros Avanzados contiene listas seleccionables para Compañía, Producto y Origen. Se debe proporcionar al usuario la capacidad de buscar texto para encontrar la opción deseada y filtrarla dentro del modal.

## 2. Requirements

- **REQ-01**: Debe existir una barra de búsqueda de texto justo encima de las opciones de Compañía.
- **REQ-02**: Debe existir una barra de búsqueda de texto justo encima de las opciones de Producto.
- **REQ-03**: Debe existir una barra de búsqueda de texto justo encima de las opciones de Origen.
- **REQ-04**: El filtrado ocurre en tiempo real en el cliente. Opciones que no coincidan con la búsqueda no se renderizan.
- **REQ-05**: Si ninguna opción coincide con la búsqueda, mostrar "No se encontraron resultados."
- **REQ-06**: El botón "Limpiar" también debe vaciar las barras de búsqueda de todos los filtros.

## 3. Scenarios

### Scenario 1: Filtrado de lista por texto
- **Given** el usuario abre el modal de filtros avanzados
- **When** el usuario escribe "SKANDIA" en el buscador de Compañía
- **Then** la lista de Compañías solo debe mostrar aquellas cuyo nombre contenga "SKANDIA" (ignorando mayúsculas y minúsculas).

### Scenario 2: Reinicio mediante botón Limpiar
- **Given** el usuario introdujo búsquedas en los tres filtros
- **When** el usuario hace clic en el botón "Limpiar"
- **Then** todos los campos de búsqueda quedan vacíos y las listas muestran todos los elementos de nuevo.
