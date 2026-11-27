---
"financieramente-app": patch
---

### Mejorado

- Las pantallas de Roles, Mis distribuciones, reglas de distribución, permisos de reportes, detalle de usuario, tipos de categoría, calculadora, pre-liquidación y los paneles de comentarios y comprobantes muestran un esqueleto con la forma del contenido mientras cargan, en lugar de un spinner o un texto.

### Técnico

- New shared primitives in `shared/ui/loading-skeletons.tsx`: `SkeletonRegion` (`role="status"`, `aria-busy`, Spanish `aria-label`), `ListRowsSkeleton`, `CardGridSkeleton`, `FormSkeleton`; plus `mis-distribuciones/components/distribution-skeletons.tsx`.
