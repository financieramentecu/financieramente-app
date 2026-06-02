# Specifications: Simulador y Suplantación

## Features & Requirements

### 1. Suplantación de Sesión (Admin)
- **REQ-1**: Un usuario Administrador debe poder suplantar la sesión de cualquier usuario de negocio (Money Strategy / Agente) desde un selector en la barra superior del Dashboard.
- **REQ-2**: El selector debe permitir buscar al usuario por nombre o apellido (patrón Combobox).
- **REQ-3**: Durante la suplantación, el sistema completo (Frontend y Backend) debe tratar al Admin como si fuera el usuario suplantado (permisos, niveles, acceso a datos).
- **REQ-4**: Debe aparecer un banner naranja global visible que indique que se está suplantando una cuenta, y que provea un botón para detener la suplantación.
- **REQ-5**: Un Admin no puede suplantar a otro Admin.
- **REQ-6**: El selector de impersonación debe consumir un endpoint de búsqueda que soporte traer toda la lista relevante sin requerir escribir 3 caracteres (`forImpersonation=true`).

### 2. Ajustes al Simulador de Comisiones
- **REQ-7**: Renombrar la sección de "Simulador" a "Calculadora" en la Interfaz.
- **REQ-8**: El input del Monto de Venta debe mostrar un indicativo de moneda (USD o COP) que responda a la compañía seleccionada.
- **REQ-9**: Para roles no administradores, el campo "Tu Nivel" debe estar seleccionado por defecto con el nivel real del usuario autenticado (o suplantado).
- **REQ-10**: El campo "Nivel que Vendió" solo debe mostrar el nivel actual del usuario y los subniveles inferiores según jerarquía. Un Admin puede ver todos si no ha filtrado.
- **REQ-11**: Actualizar el copy del disclaimer final: "Para el calculo de la comision crea patrimonio, el monto total de la venta coloca el APE (PRIMA MENSUAL POR 12)".
