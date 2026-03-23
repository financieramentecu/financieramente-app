# Migration Checklist (Práctico)

Basado en `specs/002-architecture-refactor/contracts/migration-steps.md`.

## Checklist por servicio

### currency

- [ ] Consolidate (si aplica): comparar legacy vs feature, preservar funcionalidad y actualizar tests del código consolidado.
- [ ] Migrate code: mover/crear estructura en feature (lib/, types/, hooks/, components/) y asegurar convenciones (sin `any`, `readonly` donde corresponda).
- [ ] Update imports: reemplazar todas las referencias a legacy (incl. tests) por la nueva ubicación en feature.
- [ ] Migrate tests: mover a `features/[feature]/__tests__/` y actualizar imports/mocks.
- [ ] Run automated tests: unit + integration relacionados y suite completa.
- [ ] Manual smoke: validar flujos críticos impactados (UI/requests principales) y ausencia de regresiones.
- [ ] Delete legacy: confirmar cero referencias, borrar archivo(s) legacy y limpiar directorios si aplica.

### periodicity

- [ ] Consolidate (si aplica): comparar legacy vs feature, preservar funcionalidad y actualizar tests del código consolidado.
- [ ] Migrate code: mover/crear estructura en feature (lib/, types/, hooks/, components/) y asegurar convenciones (sin `any`, `readonly` donde corresponda).
- [ ] Update imports: reemplazar todas las referencias a legacy (incl. tests) por la nueva ubicación en feature.
- [ ] Migrate tests: mover a `features/[feature]/__tests__/` y actualizar imports/mocks.
- [ ] Run automated tests: unit + integration relacionados y suite completa.
- [ ] Manual smoke: validar flujos críticos impactados (UI/requests principales) y ausencia de regresiones.
- [ ] Delete legacy: confirmar cero referencias, borrar archivo(s) legacy y limpiar directorios si aplica.

### origin

- [ ] Consolidate (si aplica): comparar legacy vs feature, preservar funcionalidad y actualizar tests del código consolidado.
- [ ] Migrate code: mover/crear estructura en feature (lib/, types/, hooks/, components/) y asegurar convenciones (sin `any`, `readonly` donde corresponda).
- [ ] Update imports: reemplazar todas las referencias a legacy (incl. tests) por la nueva ubicación en feature.
- [ ] Migrate tests: mover a `features/[feature]/__tests__/` y actualizar imports/mocks.
- [ ] Run automated tests: unit + integration relacionados y suite completa.
- [ ] Manual smoke: validar flujos críticos impactados (UI/requests principales) y ausencia de regresiones.
- [ ] Delete legacy: confirmar cero referencias, borrar archivo(s) legacy y limpiar directorios si aplica.

### company

- [ ] Consolidate (si aplica): comparar legacy vs feature, preservar funcionalidad y actualizar tests del código consolidado.
- [ ] Migrate code: mover/crear estructura en feature (lib/, types/, hooks/, components/) y asegurar convenciones (sin `any`, `readonly` donde corresponda).
- [ ] Update imports: reemplazar todas las referencias a legacy (incl. tests) por la nueva ubicación en feature.
- [ ] Migrate tests: mover a `features/[feature]/__tests__/` y actualizar imports/mocks.
- [ ] Run automated tests: unit + integration relacionados y suite completa.
- [ ] Manual smoke: validar flujos críticos impactados (UI/requests principales) y ausencia de regresiones.
- [ ] Delete legacy: confirmar cero referencias, borrar archivo(s) legacy y limpiar directorios si aplica.

### product

- [ ] Consolidate (si aplica): comparar legacy vs feature, preservar funcionalidad y actualizar tests del código consolidado.
- [ ] Migrate code: mover/crear estructura en feature (lib/, types/, hooks/, components/) y asegurar convenciones (sin `any`, `readonly` donde corresponda).
- [ ] Update imports: reemplazar todas las referencias a legacy (incl. tests) por la nueva ubicación en feature.
- [ ] Migrate tests: mover a `features/[feature]/__tests__/` y actualizar imports/mocks.
- [ ] Run automated tests: unit + integration relacionados y suite completa.
- [ ] Manual smoke: validar flujos críticos impactados (UI/requests principales) y ausencia de regresiones.
- [ ] Delete legacy: confirmar cero referencias, borrar archivo(s) legacy y limpiar directorios si aplica.

## Checklist por dominio lib/

### auth

- [ ] Consolidate (si aplica): comparar implementación legacy vs actual, preservar comportamiento (sesión/guards) y actualizar tests.
- [ ] Migrate code: mover/centralizar a la ubicación destino acordada (feature o `src/lib/auth/`) y asegurar tipado estricto (sin `any`).
- [ ] Update imports: actualizar todas las rutas de import (app, features, tests) hacia la nueva ubicación.
- [ ] Migrate tests: mover/ajustar tests relacionados y actualizar mocks/fixtures.
- [ ] Run automated tests: unit + integration relacionados y suite completa.
- [ ] Manual smoke: login/logout, sesión persistente, rutas protegidas y flujos SSO si aplica.
- [ ] Delete legacy: eliminar código legacy solo cuando no existan referencias y todo pase.

### currency

- [ ] Consolidate (si aplica): comparar legacy vs actual, preservar reglas de negocio y actualizar tests.
- [ ] Migrate code: mover/centralizar a ubicación destino (feature o lib) y asegurar convenciones (sin `any`, validación si aplica).
- [ ] Update imports: actualizar todos los imports (incl. tests) a la nueva ubicación.
- [ ] Migrate tests: mover/ajustar tests relacionados y actualizar mocks/fixtures.
- [ ] Run automated tests: unit + integration relacionados y suite completa.
- [ ] Manual smoke: pantallas/flows que consumen moneda (formatos, selects, APIs) sin regresión.
- [ ] Delete legacy: eliminar código legacy y limpiar directorios si aplica.

### email

- [ ] Consolidate (si aplica): comparar legacy vs actual, preservar templates/config y actualizar tests.
- [ ] Migrate code: mover/centralizar a ubicación destino (feature o `src/lib/`) con tipado estricto y sin `any`.
- [ ] Update imports: actualizar imports en servicios/features/routes/tests.
- [ ] Migrate tests: mover/ajustar tests y actualizar mocks (env, transport, sendgrid, etc.).
- [ ] Run automated tests: unit + integration relacionados y suite completa.
- [ ] Manual smoke: envío de email en flujos críticos (si es seguro en entorno), o validar con mocks/logs.
- [ ] Delete legacy: eliminar código legacy y confirmar cero referencias.
