---
'financieramente-app': patch
---

### Mejorado

- El historial del lead se lee del evento más antiguo al más reciente.
- En el historial se pueden adjuntar imágenes y documentos. Las imágenes se amplían y los documentos se descargan.

### Técnico

- `POST /api/leads/[id]/activities` accepts JSON or multipart (`event` + `files`) and stores attachment metadata on the activity payload.
- `GET /api/leads/[id]/activities/[activityId]/files/[index]` streams the stored file.
