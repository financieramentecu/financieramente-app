# Design: PPC global por defecto en creación de negocio

## Technical Approach

Mantener el contrato actual del flujo de creación (`createBusiness`) y cambiar únicamente la resolución de comisión (`findProductPercentageCommission` + `getPpcForNewBusinesses`) para soportar fallback global. La prioridad será:
1) PPC específico configurado para nuevos negocios por combinación (`idProduct`, `idClientOrigin`, `idCategory`), 2) PPC global activo con categorías activas.

Esto evita bloqueo de creación sin tocar el modelo `Business` ni rutas externas.

## Architecture Decisions

| Option | Tradeoff | Decision |
|------|--------|-------------|
| Hacer `idProductPercentageCommission` nullable en `Business` | Más flexible pero requiere migraciones y cambios amplios en cálculo | No elegido |
| Fallback global desde `createBusiness` | Acopla lógica de resolución al caso de uso | No elegido |
| Fallback global en servicio de resolución de PPC | Centraliza regla, mínimo impacto en capas consumidoras | Elegido |
| Fallback a cualquier PPC activo sin categorías | Puede romper cálculo posterior en pre-liquidación | No elegido |

## Data Flow

La data sigue el mismo pipeline, cambiando solo la decisión interna de lookup:

`useBusinessForm` -> `createBusiness` -> `findProductPercentageCommission` -> `getPpcForNewBusinesses` -> Prisma  

Resolución:

`ProductConfiguration` (match exacto) -> `productPercentageCommissionNewBusinesses`  
`             | (si null/no config)`  
`             v`  
`ProductPercentageCommission` global activo + con categorías activas

Resultado:

`createBusiness` recibe `idProductPercentageCommission` válido -> persiste `Business`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/negocios/services/product-configuration.service.ts` | Modify | Extender `getPpcForNewBusinesses` con query fallback global determinística |
| `src/features/negocios/actions/find-product-percentage-commission.ts` | Modify | Devolver éxito si hay PPC (específico o fallback), conservar errores cuando no hay ninguno |
| `src/features/negocios/actions/create-business.ts` | Keep (no API change) | Reutiliza action actual sin cambios de interfaz |
| `src/features/negocios/__tests__/services/product-configuration.service.test.ts` | Modify | Cubrir prioridad de match específico, fallback global y caso sin fallback |
| `src/features/negocios/__tests__/actions/create-business.test.ts` | Modify | Verificar que creación funciona con PPC retornado por fallback |

## Interfaces / Contracts

No se crean contratos nuevos. Se mantiene:

```ts
interface GetPpcForNewBusinessesResult {
	configExists: boolean
	ppc: ProductPercentageCommission | null
}
```

Cambio semántico: `ppc` puede venir de fallback global aunque `configExists` sea `false`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Prioridad de resolución (específico > global) | Mock Prisma en `getPpcForNewBusinesses` |
| Unit | Error cuando no existe ningún PPC elegible | Mock `findUnique` y `findFirst` en null |
| Unit | `findProductPercentageCommission` retorna `data` al recibir fallback | Tests directos de action con mocks de servicio |
| Integration | Creación de negocio no bloqueada por ausencia de config específica | Test de `createBusiness` mockeando action de lookup con PPC válido |
| E2E | N/A en esta fase | No incluido en este cambio |

## Migration / Rollout

No migration required.  
Rollout inmediato con monitoreo de errores en creación y métricas de uso de fallback (si se instrumenta en fase de implementación).

## Open Questions

- [ ] ¿Se debe excluir del fallback global cualquier PPC con `hasPortfolio=true` para evitar asignaciones no deseadas?
- [ ] ¿Debemos registrar auditoría explícita cuando se usa fallback global (flag/campo en log)?
