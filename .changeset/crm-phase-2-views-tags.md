---
'financieramente-app': minor
---

### Agregado
- CRM: pestaña **Leads** con tabla de leads: búsqueda por nombre, correo, teléfono o documento; filtros por estado, etapa, etiqueta y "sin actividad"; orden por columnas y paginación.
- CRM: exportación a CSV de los leads filtrados (abre bien en Excel).
- CRM: vistas guardadas personales con los filtros y el orden de la tabla.
- CRM: etiquetas de colores en los leads, visibles en la tabla y en la ficha.
- CRM: valor estimado y probabilidad por lead, con el valor ponderado del pipeline en la tabla.
- CRM: campos personalizados simples (texto, número, fecha o lista) en la ficha del lead.
- CRM: diálogo **Configurar** para que los gestores administren etiquetas y campos personalizados.

### Técnico
- Migration `20261110120000_add_lead_views_tags_fields` (additive): `lead.estimated_value`, `lead.probability` (CHECK 0..100), `lead.custom_field_values` (JSONB), new models `LeadTag`, `LeadTagAssignment`, `LeadCustomField`, `LeadSavedView`, enum `LeadCustomFieldType`.
- New flags `crm_lead_table` and `crm_lead_fields` (off by default).
- New endpoints: `GET /api/crm/leads`, `GET /api/crm/leads/export`, `GET /api/crm/stages`, `GET|POST /api/crm/views`, `PATCH|DELETE /api/crm/views/[id]`, `GET|POST /api/crm/tags`, `DELETE /api/crm/tags/[id]`, `PUT /api/leads/[id]/tags`, `GET|POST /api/crm/custom-fields`, `PATCH|DELETE /api/crm/custom-fields/[id]`, `GET|PATCH /api/leads/[id]/crm-fields`.
- New audit actions `LEAD_TABLE_EXPORTED`, `LEAD_VIEW_*`, `LEAD_TAG_*`, `LEAD_TAGS_UPDATED`, `LEAD_CRM_FIELDS_UPDATED`, `LEAD_CUSTOM_FIELD_*`.
- `LeadCard` and `LeadDetail` expose `tags` and `estimatedValue` (detail also `probability`); the `crm-sync` webhook never writes CRM-owned columns.
