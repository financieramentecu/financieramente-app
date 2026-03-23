# Guía de pruebas de correos de notificación

## Correos del sistema

| Correo | Trigger | Archivo |
|--------|---------|---------|
| Nuevo usuario (admin) | Usuario nuevo se registra | `admin-notifications.ts` |
| Activación de cuenta | Admin activa usuario | `user-activation-notification.ts` |
| Resumen pre-liquidación | Envío de resumen a agente | `preliquidacion-resumen-notification.ts` |

## Envío de prueba local

```bash
npm run test:email tu-email@ejemplo.com
```

Este script envía un email tradicional de prueba. Para probar los correos de notificación específicos, usa el endpoint de test o activa los flujos reales en desarrollo.

## Pruebas en clientes de correo

### Checklist por cliente

#### Gmail (web y app móvil)

- [ ] HTML se renderiza correctamente
- [ ] Logo visible (URL absoluta)
- [ ] Botón CTA visible y clicable
- [ ] Tabla responsive (pre-liquidación) se adapta en móvil
- [ ] Plain text legible si HTML falla
- [ ] No aparece en Spam

#### Outlook (web, desktop, app móvil)

- [ ] Estilos inline respetados (Outlook usa Word como motor)
- [ ] Tablas con bordes visibles
- [ ] Colores de marca correctos (#00505C, #83D874)
- [ ] Footer visible

#### Apple Mail

- [ ] Media queries aplicadas en vista móvil
- [ ] Tipografía y espaciado correctos
- [ ] Imágenes cargadas (logo)

### Viewports recomendados

- **Móvil**: 375px, 390px (iPhone)
- **Tablet**: 768px
- **Desktop**: 600px (ancho máximo del contenedor)

### Herramientas opcionales

- **Litmus** o **Email on Acid**: Pruebas automatizadas en múltiples clientes
- **Mail Tester**: Verificación de spam score
- **DevTools**: Inspeccionar email en Gmail (vista de código fuente)

## Verificación de plain text

Cada correo incluye versión `text` además de `html`. Para verificar:

1. Desactiva "Mostrar imágenes" o usa un cliente de solo texto
2. Confirma que el mensaje principal, datos y enlaces son legibles
3. El plain text debe contener la misma información que el HTML

## Estándares de calidad

- DOCTYPE, charset UTF-8, meta viewport
- Estilos inline para compatibilidad
- Media query `@media (max-width: 600px)` para móvil
- Versión plain text
- Alt en imágenes
- Contraste adecuado (WCAG AA)
