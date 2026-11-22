---
"financieramente-app": patch
---

### Técnico

- CRM access and scope now come from the permission catalog instead of role codes: new `leads.gestionar` (scoped; opens the CRM and writes, `COMPANY` scope writes the whole company), `leads.reasignar_estrategia`, `leads.configurar_avisos` and `negocios.editar_valor`, with default grants that keep the previous behavior.
- `requireCrmActor`, `resolveCrmVisibility`, the CRM policy helpers, the CRM page, tabs and detail sheet, the hierarchy tree route and the Valor de Negocio edit rule use those permissions. Run `npm run prisma:seed:permissions` in each environment to add the new codes.
