---
"financieramente-app": patch
---

### Técnico

- CRM access and scope now come from the permission catalog instead of role codes: new `leads.gestionar` (scoped; opens the CRM and writes, `COMPANY` scope writes the whole company), `leads.reasignar_estrategia`, `leads.configurar_avisos` and `negocios.editar_valor`, with default grants that keep the previous behavior.
- `requireCrmActor`, `resolveCrmVisibility`, the CRM policy helpers, the CRM page, tabs and detail sheet, the hierarchy tree route and the Valor de Negocio edit rule use those permissions.
- New `leads.configurar_crm` gates creating, editing and deleting CRM custom fields, tags, activity labels and activity columns (`requireCrmActor` accepts an extra `permission` option). New `leads.exportar` gates the lead table and CRM report exports (`CrmActor.canExport`). Both default to the roles that manage the CRM today, so behavior is unchanged until an admin narrows them from the roles screen.
- New `leads.gestionar_capturas` (default ADMIN only) replaces the ADMIN role check on the lead captures admin API, page and admin card. The create-lead dialog now reads `leads.gestionar` from the session grants. Run `npm run prisma:seed:permissions` in each environment to add the new codes.
