# Specification: Sistema de Notificaciones Analista de Soporte

## Description
Como Analista de Soporte, quiero recibir una notificación dentro del sistema cada vez que se adjunte un soporte a un negocio, para estar al tanto de forma inmediata de los documentos registrados y poder tomar acciones oportunas.

## Requirements

1. **Notificación generada al adjuntar un soporte a un negocio**
   - Cuando un usuario registra un soporte en el negocio y queda guardado exitosamente.
   - El sistema debe generar automáticamente una notificación visible.
   - La notificación muestra la descripción con el número de contrato y el nombre del agente del negocio.
   - Incluye un enlace que redirige directamente al detalle del negocio ("Ver mas").

2. **Visualización de la notificación en el módulo (Drawer y panel histórico)**
   - El Analista de Soporte accede al módulo de notificaciones (se abre un Drawer en el lado derecho que empuja el contenido principal).
   - El sistema lista todas las notificaciones activas e históricas ordenadas de más reciente a más antigua.
   - Las notificaciones leídas se distinguen visualmente de las nuevas/no vistas mediante un chip.
   - El estado cambia a "leída" al hacer clic en "Ver mas".

3. **Cierre de una notificación**
   - Si el Analista selecciona la opción "Cerrar" sobre una notificación activa.
   - La notificación desaparece de la vista activa.

4. **Estado de "Ninguna notificación"**
   - Si no existen notificaciones pendientes ni históricas.
   - El sistema muestra un estado vacío en el Drawer con el mensaje "No tienes notificaciones pendientes".
   - No se muestra ningún contador de alertas en el ícono del módulo.

9. **Marcar todas como leídas**
   - El Analista selecciona la opción global "Marcar todas como leídas" dentro del Drawer.
   - Todas las notificaciones nuevas cambian su estado a leídas.
   - El contador de "no leídas" pasa a 0 y desaparecen los chips de "nueva".

10. **Filtrar notificaciones por usuario**
    - El Analista selecciona un usuario específico desde un control de filtros en el Drawer.
    - La lista de notificaciones se actualiza para mostrar únicamente las generadas por el usuario seleccionado.

5. **Redirección al negocio desde la notificación**
   - Al seleccionar el enlace de redirección.
   - El sistema lleva al Analista a la nueva página de detalle del negocio (`/dashboard/negocios/[id]`).
   - La página de detalle carga mostrando la información y la sección de soportes adjuntados.

6. **Múltiples soportes adjuntados al mismo negocio**
   - Si se adjuntan dos soportes en momentos distintos al mismo negocio.
   - El sistema muestra dos notificaciones independientes, una por cada soporte.
   - Cada notificación refleja la descripción particular del soporte que la originó.

7. **Visualización del contador de notificaciones leídas y no leídas**
   - El sistema muestra un resumen con el total de notificaciones no leídas y el total de leídas.
   - El contador de no leídas se decrementa automáticamente al visualizar una notificación por primera vez (al marcar como leída).
   - El contador de leídas se incrementa en la misma proporción.
   - Los contadores se actualizan en tiempo real por websockets.

8. **Actualización de contadores al cerrar una notificación**
   - Si el Analista cierra una notificación (leída o no leída).
   - La notificación es eliminada de la vista activa.
   - El contador correspondiente se decrementa inmediatamente.
   - El resumen de totales refleja el estado actualizado.

## Scenarios

```gherkin
Feature: Notificaciones en tiempo real para Analistas de Soporte

  Scenario: 1. Notificación generada al adjuntar un soporte a un negocio
    Given un usuario con permisos registra un soporte en el negocio
    When el soporte queda guardado exitosamente en el sistema
    Then el sistema genera automáticamente una notificación visible
    And la notificación muestra la descripción con el número de contrato y el nombre del agente
    And la notificación incluye un enlace que redirige directamente al detalle del negocio

  Scenario: 2. El Analista de Soporte visualiza la notificación en el Drawer histórico
    Given el Analista de Soporte accede al módulo de notificaciones
    Then se abre un Drawer en el lado derecho que empuja el contenido principal
    And el sistema lista todas las notificaciones (nuevas e históricas) ordenadas de más reciente a más antigua
    And las notificaciones leídas se distinguen visualmente de las nuevas (un chip)
    And se cambia de estado de no leída a leída cuando se da en "Ver mas"

  Scenario: 3. El Analista de Soporte cierra una notificación
    Given el Analista de Soporte visualiza una notificación activa en el módulo
    When selecciona la opción "Cerrar" sobre dicha notificación
    Then la notificación desaparece de la vista activa

  Scenario: 4. Ninguna notificación disponible
    Given no existen notificaciones pendientes ni históricas para el Analista de Soporte
    When accede al módulo de notificaciones
    Then el sistema muestra un estado vacío con el mensaje "No tienes notificaciones pendientes"
    And no se muestra ningún contador de alertas en el ícono del módulo

  Scenario: 9. Marcar todas las notificaciones como leídas
    Given el Analista de Soporte tiene notificaciones no leídas en el Drawer
    When selecciona la opción global "Marcar todas como leídas"
    Then todas las notificaciones nuevas cambian su estado a leídas
    And el contador de no leídas se actualiza a 0
    And los indicadores visuales de "nueva" desaparecen

  Scenario: 10. Filtrar notificaciones por usuario
    Given el Analista de Soporte visualiza el historial de notificaciones en el Drawer
    When selecciona un usuario específico en el filtro de notificaciones
    Then el sistema actualiza la lista mostrando únicamente las notificaciones generadas por ese usuario

  Scenario: 5. Redirección al negocio desde la notificación
    Given el Analista de Soporte visualiza una notificación con el enlace al negocio
    When selecciona el enlace de redirección
    Then el sistema lo lleva a la nueva ruta de detalle del negocio
    And la página carga mostrando toda la información del negocio y la sección de soportes adjuntados

  Scenario: 6. Múltiples soportes adjuntados al mismo negocio
    Given se adjuntan dos soportes en momentos distintos al mismo negocio
    When el Analista de Soporte accede al módulo de notificaciones
    Then el sistema muestra dos notificaciones independientes, una por cada soporte registrado
    And cada notificación refleja la descripción particular del soporte que la originó

  Scenario: 7. Visualización del contador de notificaciones leídas y no leídas en el módulo
    Given el Analista de Soporte accede al módulo de notificaciones
    When el módulo carga o se produce cualquier cambio de estado en una notificación
    Then el sistema muestra un resumen con el total de notificaciones no leídas y el total de leídas
    And el contador de no leídas se decrementa automáticamente cada vez que el Analista visualiza una notificación por primera vez
    And el contador de leídas se incrementa en la misma proporción
    And ambos contadores se actualizan en tiempo real

  Scenario: 8. Actualización de contadores al cerrar una notificación
    Given el Analista de Soporte tiene notificaciones activas (leídas y no leídas)
    When cierra una notificación desde el módulo
    Then el sistema elimina esa notificación de la vista activa
    And el contador correspondiente (leídas o no leídas según su estado previo) se decrementa inmediatamente
    And el resumen de totales refleja el estado actualizado
```
